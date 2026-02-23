import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * OpenSea standard NFT attributes (traits)
 */
export class NftAttribute {
  @IsString()
  @IsNotEmpty()
  traitType: string;

  @IsNotEmpty()
  value: string | number;

  @IsString()
  @IsOptional()
  displayType?: string; // 'number', 'boost_number', 'boost_percentage', 'date'

  @IsNumber()
  @IsOptional()
  maxValue?: number; // For boost_percentage
}

/**
 * OpenSea standard NFT metadata
 * https://docs.opensea.io/docs/metadata-standards
 */
export class UploadMetadataDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  image: string; // ipfs://CID format

  @IsUrl()
  @IsOptional()
  externalUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NftAttribute)
  @IsOptional()
  attributes?: NftAttribute[];

  @IsString()
  @IsOptional()
  animationUrl?: string; // For video/audio NFTs

  @IsString()
  @IsOptional()
  backgroundColor?: string; // 6-character hex string (without #)
}
