import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { IpfsService } from './ipfs.service';
import { UploadMetadataDto } from './dto/upload-metadata.dto';

@Controller('ipfs')
export class IpfsController {
  constructor(private readonly ipfsService: IpfsService) {}

  /**
   * POST /ipfs/upload/image
   * Upload image to IPFS + S3 cache
   */
  @Post('upload/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    const { ipfsUri, s3Url } = await this.ipfsService.uploadImage(
      file.buffer,
      file.originalname,
    );

    return {
      success: true,
      cid: ipfsUri,
      httpUrl: this.ipfsService.ipfsToHttpUrl(ipfsUri),
      s3Url,
    };
  }

  /**
   * POST /ipfs/upload/batch
   * Upload multiple images to IPFS + S3 cache (up to 50 files)
   */
  @Post('upload/batch')
  @UseInterceptors(FilesInterceptor('files', 50))
  async uploadBatch(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded.');
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const { ipfsUri, s3Url } = await this.ipfsService.uploadImage(
          files[i].buffer,
          files[i].originalname,
        );
        results.push({
          index: i,
          originalName: files[i].originalname,
          success: true,
          cid: ipfsUri,
          httpUrl: this.ipfsService.ipfsToHttpUrl(ipfsUri),
          s3Url,
        });
      } catch (error) {
        errors.push({
          index: i,
          originalName: files[i].originalname,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: errors.length === 0,
      total: files.length,
      uploaded: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * POST /ipfs/upload/metadata
   * Upload NFT metadata to IPFS (OpenSea standard)
   */
  @Post('upload/metadata')
  async uploadMetadata(@Body() dto: UploadMetadataDto) {
    const ipfsUri = await this.ipfsService.uploadMetadata(dto);

    return {
      success: true,
      cid: ipfsUri,
      httpUrl: this.ipfsService.ipfsToHttpUrl(ipfsUri),
    };
  }

  /**
   * POST /ipfs/upload/metadata/batch
   * Upload multiple NFT metadata to IPFS
   */
  @Post('upload/metadata/batch')
  async uploadMetadataBatch(@Body() dtos: UploadMetadataDto[]) {
    if (!Array.isArray(dtos) || dtos.length === 0) {
      throw new BadRequestException('No metadata provided.');
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < dtos.length; i++) {
      try {
        const ipfsUri = await this.ipfsService.uploadMetadata(dtos[i]);
        results.push({
          index: i,
          name: dtos[i].name,
          success: true,
          cid: ipfsUri,
          httpUrl: this.ipfsService.ipfsToHttpUrl(ipfsUri),
        });
      } catch (error) {
        errors.push({
          index: i,
          name: dtos[i].name,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: errors.length === 0,
      total: dtos.length,
      uploaded: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }
}
