/**
 * Offers Contract ABI
 *
 * NFT offer system with immediate escrow deposit.
 * Functions: createOffer, acceptOffer, cancelOffer, withdrawExpired
 * Events: OfferCreated, OfferAccepted, OfferCanceled, OfferWithdrawn
 */

export const OffersAbi = [
  // Events
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'offerer',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'nftContract',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'price',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'expiresAt',
        type: 'uint256',
      },
    ],
    name: 'OfferCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'seller',
        type: 'address',
      },
    ],
    name: 'OfferAccepted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256',
      },
    ],
    name: 'OfferCanceled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256',
      },
    ],
    name: 'OfferWithdrawn',
    type: 'event',
  },
  // Functions
  {
    inputs: [
      {
        internalType: 'address',
        name: 'nftContract',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'expiresAt',
        type: 'uint256',
      },
    ],
    name: 'createOffer',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256',
      },
    ],
    name: 'acceptOffer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256',
      },
    ],
    name: 'cancelOffer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'offerId',
        type: 'uint256',
      },
    ],
    name: 'withdrawExpired',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Read functions
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'offers',
    outputs: [
      {
        internalType: 'address',
        name: 'offerer',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'nftContract',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'price',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'expiresAt',
        type: 'uint256',
      },
      {
        internalType: 'bool',
        name: 'accepted',
        type: 'bool',
      },
      {
        internalType: 'bool',
        name: 'canceled',
        type: 'bool',
      },
      {
        internalType: 'bool',
        name: 'withdrawn',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
