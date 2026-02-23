import { IsString, IsEthereumAddress, IsNumberString, IsOptional, IsInt, IsIn, Matches, Min } from 'class-validator';

export class CreateListingDto {
  @IsEthereumAddress()
  contractAddress: string;

  @IsString()
  tokenId: string;

  @IsNumberString()
  @Matches(/^[1-9]\d*$/, { message: 'price must be a positive integer string (wei)' })
  price: string;

  @IsEthereumAddress()
  seller: string;

  @IsString()
  transactionHash: string;

  @IsNumberString()
  blockNumber: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsNumberString()
  pricePerUnit?: string;

  @IsOptional()
  @IsIn(['ERC721', 'ERC1155'])
  contractType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  onChainListingId?: number;
}
