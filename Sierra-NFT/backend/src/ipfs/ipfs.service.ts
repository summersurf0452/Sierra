import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinataSDK } from 'pinata';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { UploadMetadataDto } from './dto/upload-metadata.dto';

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private readonly pinata: PinataSDK;
  private readonly gateway: string;
  private readonly s3: S3Client | null = null;
  private readonly s3Bucket: string;
  private readonly s3Region: string;

  // Allowed image extensions
  private readonly ALLOWED_EXTENSIONS = [
    'png',
    'jpg',
    'jpeg',
    'gif',
    'svg',
    'webp',
  ];

  // Max file size: 10MB
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

  constructor(private readonly configService: ConfigService) {
    const jwt = this.configService.get<string>('PINATA_JWT');
    this.gateway = this.configService.get<string>('PINATA_GATEWAY');

    if (!jwt) {
      this.logger.warn(
        'PINATA_JWT is not configured. IPFS uploads will not work.',
      );
    }

    if (!this.gateway) {
      this.logger.warn(
        'PINATA_GATEWAY is not configured. Using default gateway.',
      );
    }

    this.pinata = new PinataSDK({
      pinataJwt: jwt,
    });

    // S3 configuration
    this.s3Bucket = this.configService.get<string>('AWS_S3_BUCKET') || '';
    this.s3Region =
      this.configService.get<string>('AWS_S3_REGION') || 'ap-northeast-2';

    if (this.s3Bucket) {
      this.s3 = new S3Client({
        region: this.s3Region,
        ...(this.configService.get<string>('AWS_ACCESS_KEY_ID') && {
          credentials: {
            accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
            secretAccessKey: this.configService.get<string>(
              'AWS_SECRET_ACCESS_KEY',
            ),
          },
        }),
      });
      this.logger.log(
        `S3 image cache enabled: ${this.s3Bucket} (${this.s3Region})`,
      );
    } else {
      this.logger.warn(
        'AWS_S3_BUCKET is not configured. S3 image cache is disabled.',
      );
    }
  }

  /**
   * Upload image file to Pinata + S3 cache
   */
  async uploadImage(
    file: Buffer,
    fileName: string,
  ): Promise<{ ipfsUri: string; s3Url: string | null }> {
    // File size validation
    if (file.length > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size too large. Maximum ${this.MAX_FILE_SIZE / 1024 / 1024}MB allowed.`,
      );
    }

    // Extension validation
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension || !this.ALLOWED_EXTENSIONS.includes(extension)) {
      throw new BadRequestException(
        `Unsupported file type. Allowed: ${this.ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    try {
      // Safe file name for non-ASCII characters
      const safeName = `upload_${Date.now()}.${extension}`;
      const uint8Array = new Uint8Array(file);
      const blob = new Blob([uint8Array]);
      const fileObj = new File([blob], safeName);

      // Upload to Pinata (public network)
      const upload = await this.pinata.upload.public.file(fileObj).name(safeName);

      const ipfsUri = `ipfs://${upload.cid}`;
      this.logger.log(`Image uploaded to IPFS: ${ipfsUri}`);

      // Upload to S3 cache (non-blocking)
      let s3Url: string | null = null;
      if (this.s3 && this.s3Bucket) {
        try {
          s3Url = await this.uploadToS3(file, upload.cid, extension);
          this.logger.log(`Image cached to S3: ${s3Url}`);
        } catch (s3Error) {
          this.logger.error(
            `S3 cache upload failed (non-critical): ${s3Error.message}`,
          );
          // S3 failure is non-critical, IPFS upload succeeded
        }
      }

      return { ipfsUri, s3Url };
    } catch (error) {
      this.logger.error(
        `Image upload failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Image upload failed.');
    }
  }

  /**
   * Upload image to S3 for fast CDN access
   */
  private async uploadToS3(
    file: Buffer,
    cid: string,
    extension: string,
  ): Promise<string> {
    const contentTypeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
    };

    const key = `nft-images/${cid}.${extension}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
        Body: file,
        ContentType: contentTypeMap[extension] || 'application/octet-stream',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${key}`;
  }

  /**
   * Upload NFT metadata to Pinata (OpenSea standard)
   */
  async uploadMetadata(metadata: UploadMetadataDto): Promise<string> {
    try {
      // Convert to OpenSea standard format
      const standardizedMetadata: any = {
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
      };

      if (metadata.externalUrl) {
        standardizedMetadata.external_url = metadata.externalUrl;
      }

      if (metadata.attributes && metadata.attributes.length > 0) {
        standardizedMetadata.attributes = metadata.attributes.map((attr) => {
          const standardAttr: any = {
            trait_type: attr.traitType,
            value: attr.value,
          };
          if (attr.displayType) {
            standardAttr.display_type = attr.displayType;
          }
          if (attr.maxValue !== undefined) {
            standardAttr.max_value = attr.maxValue;
          }
          return standardAttr;
        });
      }

      if (metadata.animationUrl) {
        standardizedMetadata.animation_url = metadata.animationUrl;
      }

      if (metadata.backgroundColor) {
        standardizedMetadata.background_color = metadata.backgroundColor;
      }

      // Upload JSON to Pinata (public network)
      const upload = await this.pinata.upload.public.json(standardizedMetadata);

      const ipfsUri = `ipfs://${upload.cid}`;
      this.logger.log(`Metadata uploaded: ${ipfsUri}`);

      return ipfsUri;
    } catch (error) {
      this.logger.error(
        `Metadata upload failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Metadata upload failed.');
    }
  }

  /**
   * Convert IPFS URI to HTTP URL
   */
  ipfsToHttpUrl(ipfsUri: string): string {
    if (!ipfsUri.startsWith('ipfs://')) {
      return ipfsUri;
    }

    const cid = ipfsUri.replace('ipfs://', '');
    let gateway = this.gateway || 'https://gateway.pinata.cloud';

    // Add protocol if missing
    if (
      gateway &&
      !gateway.startsWith('http://') &&
      !gateway.startsWith('https://')
    ) {
      gateway = `https://${gateway}`;
    }

    return `${gateway}/ipfs/${cid}`;
  }

  /**
   * Get S3 URL for a given CID (if S3 is enabled)
   */
  getS3Url(cid: string, extension = 'png'): string | null {
    if (!this.s3Bucket) return null;
    return `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/nft-images/${cid}.${extension}`;
  }
}
