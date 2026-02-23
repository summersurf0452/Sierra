import { IsString, IsNumber, IsEnum, IsUrl, IsOptional, Max, Min, Length, IsEthereumAddress } from 'class-validator';
import { ContractType } from '../../database/entities/collection.entity';

export class CreateCollectionDto {
  @IsNumber()
  onChainId: number;

  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @Length(1, 50)
  symbol: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsEnum(ContractType)
  contractType: ContractType;

  @IsEthereumAddress()
  contractAddress: string;

  @IsEthereumAddress()
  creator: string;

  @IsNumber()
  @Min(0)
  @Max(1000)
  royaltyPercentage: number;
}
