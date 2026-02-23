export enum ContractType {
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}

export enum CollectionCategory {
  ART = 'Art',
  PHOTOGRAPHY = 'Photography',
  MUSIC = 'Music',
  GAMING = 'Gaming',
  COLLECTIBLES = 'Collectibles',
  OTHER = 'Other',
}

export enum AuctionStatus {
  ACTIVE = 'ACTIVE',
  SETTLED = 'SETTLED',
  CANCELED = 'CANCELED',
}

export enum OfferStatus {
  ACTIVE = 'ACTIVE',
  ACCEPTED = 'ACCEPTED',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum ReportTargetType {
  COLLECTION = 'COLLECTION',
  NFT = 'NFT',
}

export enum ReportCategory {
  SCAM = 'SCAM',
  COPYRIGHT = 'COPYRIGHT',
  INAPPROPRIATE = 'INAPPROPRIATE',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  DISMISSED = 'DISMISSED',
}
