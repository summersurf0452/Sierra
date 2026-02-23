/**
 * NFT and Listing types from backend entities
 */

export interface Collection {
  id: string;
  onChainId: number;
  name: string;
  symbol: string;
  creator: string;
  royaltyPercentage: number;
  contractAddress: string;
  contractType: 'ERC721' | 'ERC1155';
  category: string;
  description: string | null;
  coverImageUrl: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  isHidden: boolean;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NFT {
  id: string;
  tokenId: string;
  collectionId: string;
  owner: string;
  tokenURI: string;
  contractAddress: string;
  contractType: 'ERC721' | 'ERC1155';
  supply: number;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  isHidden: boolean;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
  collection?: Collection;
  listings?: Listing[];
}

export enum ListingStatus {
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
  CANCELED = 'CANCELED',
}

export interface Listing {
  id: string;
  seller: string;
  nftId: string | null;
  contractAddress: string;
  tokenId: string;
  price: string; // wei as string
  status: ListingStatus;
  buyer: string | null;
  blockNumber: string;
  transactionHash: string;
  createdAt: string;
  updatedAt: string;
  soldAt: string | null;
  amount: number | null;         // ERC-1155 listing quantity
  pricePerUnit: string | null;   // ERC-1155 price per unit in wei
  contractType: 'ERC721' | 'ERC1155' | null;
  onChainListingId: number | null; // On-chain listing ID (Marketplace1155)
  nft?: NFT;
}

export interface SearchResults {
  collections: Collection[];
  nfts: NFT[];
}

export interface CollectionWithStats extends Collection {
  salesCount?: string;
  totalVolume: string;
  floorPrice: string | null;
  totalSupply: number;
  ownerCount: number;
}

export interface Auction {
  id: string;
  onChainId: number;
  seller: string;
  nftId: string | null;
  contractAddress: string;
  tokenId: string;
  startPrice: string;
  minBidIncrement: string;
  endTime: string; // ISO timestamp
  highestBidder: string | null;
  highestBid: string;
  bidCount: number;
  status: 'ACTIVE' | 'SETTLED' | 'CANCELED';
  transactionHash: string | null;
  createdAt: string;
  updatedAt: string;
  bids?: Bid[];
}

export interface Bid {
  id: string;
  auctionId: string;
  bidder: string;
  amount: string;
  transactionHash: string;
  blockNumber: string;
  createdAt: string;
}

export enum OfferStatus {
  ACTIVE = 'ACTIVE',
  ACCEPTED = 'ACCEPTED',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface Offer {
  id: string;
  onChainId: number;
  offerer: string;
  nftId: string | null;
  contractAddress: string;
  tokenId: string;
  price: string; // wei as string
  expiresAt: string;
  status: OfferStatus;
  transactionHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  eventType: 'Mint' | 'List' | 'Sale' | 'Cancel' | 'Transfer';
  price: string | null;
  from: string | null;
  to: string | null;
  timestamp: string;
  transactionHash: string;
  blockNumber: string;
}

/**
 * Report types for Trust & Safety
 */
export type ReportTargetType = 'COLLECTION' | 'NFT';
export type ReportCategory = 'SCAM' | 'COPYRIGHT' | 'INAPPROPRIATE';
