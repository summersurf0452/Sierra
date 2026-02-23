<p align="center">
  <h1 align="center">Sierra NFT Marketplace</h1>
  <p align="center">
    A full-stack decentralized NFT marketplace built on the <strong>WorldLand blockchain</strong>
  </p>
  <p align="center">
    <a href="#features">Features</a> &middot;
    <a href="#architecture">Architecture</a> &middot;
    <a href="#smart-contracts">Smart Contracts</a> &middot;
    <a href="#getting-started">Getting Started</a> &middot;
    <a href="#api-reference">API Reference</a>
  </p>
</p>

---

## Overview

**Sierra** is a production-ready NFT marketplace that supports minting, fixed-price trading, English auctions, and offer-based negotiations on the WorldLand blockchain. It features a modern React frontend, a NestJS backend with real-time blockchain indexing, and 6 audited Solidity smart contracts.

### Why Sierra?

- **WorldLand Native** - Purpose-built for the WorldLand chain (EVM-compatible, Chain ID 103) with ultra-low gas fees and fast finality
- **Dual NFT Standards** - Full support for both ERC-721 (unique collectibles) and ERC-1155 (multi-edition items)
- **3 Trading Mechanisms** - Fixed price listings, English auctions with anti-sniping, and escrow-based offers
- **Creator Royalties** - Customizable royalties per collection (0-10%), enforced on-chain
- **No Password Required** - Sign-In with Ethereum (SIWE) for seamless wallet-based authentication

---

## Features

### For Creators

| Feature | Description |
|---------|-------------|
| **Collection Creation** | Create ERC-721 or ERC-1155 collections with custom name, symbol, and royalty settings |
| **NFT Minting** | Mint NFTs with metadata stored on IPFS via Pinata |
| **Royalty Revenue** | Earn royalties on every secondary sale (0-10%, set at collection creation) |
| **Verified Badge** | Apply for collection verification to build trust |

### For Traders

| Feature | Description |
|---------|-------------|
| **Fixed Price** | List and buy NFTs at a set price in WLC |
| **English Auctions** | Time-limited auctions with 5% minimum bid increments and 10-minute anti-sniping extension |
| **Make Offers** | Submit purchase offers with escrowed funds and expiration dates |
| **ERC-1155 Partial Buy** | Purchase specific quantities of multi-edition NFTs |

### For Everyone

| Feature | Description |
|---------|-------------|
| **Discovery** | Browse trending collections, latest listings, and search across all NFTs |
| **Advanced Filters** | Filter by price range, status, category, contract type; sort by price, popularity, or date |
| **User Profiles** | Customizable profiles with nickname, bio, and avatar; view activity history |
| **Report System** | Flag scams, copyright violations, or inappropriate content |

### Admin Panel

| Feature | Description |
|---------|-------------|
| **Dashboard** | Key metrics at a glance (users, collections, volume, listings) |
| **Moderation** | Verify/unverify collections, hide/unhide content, review reports |
| **Analytics** | API performance, blockchain sync status, and business metrics |

---

## Architecture

```
                    +-----------------+
                    |   WorldLand     |
                    |   Blockchain    |
                    |   (Chain 103)   |
                    +--------+--------+
                             |
              Smart Contracts (Solidity)
              SharedNFT721 / SharedNFT1155
              Marketplace / Marketplace1155
              Auction / Offers
                             |
                    +--------+--------+
                    |    Backend      |
                    |    (NestJS)     |
                    |                 |
                    |  - REST API     |
                    |  - Indexer      |
                    |  - SIWE Auth    |
                    |  - IPFS Upload  |
                    +--------+--------+
                             |
                    +--------+--------+
                    |   PostgreSQL    |
                    |   (TypeORM)     |
                    +--------+--------+
                             |
                    +--------+--------+
                    |    Frontend     |
                    |   (Next.js)     |
                    |                 |
                    |  - React 19     |
                    |  - RainbowKit   |
                    |  - Wagmi/Viem   |
                    |  - Tailwind CSS |
                    +-----------------+
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity ^0.8.24, Hardhat, OpenZeppelin |
| Backend | NestJS, TypeORM, PostgreSQL, Viem |
| Frontend | Next.js 16, React 19, Tailwind CSS, Radix UI |
| Wallet | RainbowKit, Wagmi, MetaMask SDK |
| Auth | SIWE (Sign-In With Ethereum), JWT |
| Storage | Pinata (IPFS) |
| State | Zustand, TanStack React Query |

---

## Smart Contracts

All contracts are deployed on **WorldLand Mainnet** (Chain ID: 103).

| Contract | Address | Purpose |
|----------|---------|---------|
| SharedNFT721 | `0x2fB2BB023CF6f53675e96C031e0C4097F14ECB81` | ERC-721 collection factory & minting |
| SharedNFT1155 | `0x23A11d589bf1Bbd44188fB8cf76F3F4C5d3382f7` | ERC-1155 collection factory & minting |
| Marketplace | `0x25838171fc912aF51174c502de7029C40Ef4D89F` | ERC-721 fixed-price trading |
| Marketplace1155 | `0x9FA059e0402A382FD58E041F5d5d915E8F159Eb9` | ERC-1155 fixed-price trading |
| Auction | `0x49fb7863410897eCf60b07A1af47308719c4DdC3` | English auction system |
| Offers | `0xf463Dd737E856c3ACA21ccAF53f9E619Bf639800` | Offer/negotiation system |

### Fee Structure

| Fee | Rate |
|-----|------|
| Platform Fee | 2.5% on all trades |
| Creator Royalty | 0-10% (set by collection creator) |
| Auction Min Increment | 5% of current highest bid |
| Anti-Sniping Window | 10 minutes before auction end |

### Security

- ReentrancyGuard on all state-changing functions
- Checks-Effects-Interactions pattern
- Pull-over-Push for fund withdrawals (auctions)
- Ownable access control for admin functions

---

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- MetaMask or compatible EVM wallet
- WLC tokens for gas fees

### 1. Clone the repository

```bash
git clone https://github.com/ForrestCrew/Sierra-NFT.git
cd Sierra-NFT
```

### 2. Install dependencies

```bash
# Root (smart contracts)
npm install

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install --legacy-peer-deps
```

### 3. Environment setup

**Backend** (`backend/.env`):
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=sierra_dev

JWT_SECRET=your-jwt-secret
ADMIN_JWT_SECRET=your-admin-jwt-secret
ADMIN_USERNAME=root
ADMIN_PASSWORD=your-admin-password

PINATA_JWT=your-pinata-jwt
PINATA_GATEWAY=your-gateway.mypinata.cloud

FRONTEND_URL=http://localhost:3000

NFT721_ADDRESS=0x2fB2BB023CF6f53675e96C031e0C4097F14ECB81
NFT1155_ADDRESS=0x23A11d589bf1Bbd44188fB8cf76F3F4C5d3382f7
MARKETPLACE_ADDRESS=0x25838171fc912aF51174c502de7029C40Ef4D89F
AUCTION_ADDRESS=0x49fb7863410897eCf60b07A1af47308719c4DdC3
OFFERS_ADDRESS=0xf463Dd737E856c3ACA21ccAF53f9E619Bf639800
MARKETPLACE1155_ADDRESS=0x9FA059e0402A382FD58E041F5d5d915E8F159Eb9

RPC_URL=https://seoul.worldland.foundation
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_PINATA_GATEWAY=your-gateway.mypinata.cloud
```

### 4. Run the project

```bash
# Backend
cd backend && npm run start:dev

# Frontend (in another terminal)
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/nonce?address={addr}` | Get SIWE nonce |
| POST | `/auth/verify` | Verify SIWE signature |
| POST | `/auth/logout` | Sign out |
| GET | `/auth/me` | Current user profile |

### Collections
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/collections` | List all collections |
| GET | `/collections/trending` | Trending collections |
| GET | `/collections/:id` | Collection details |
| POST | `/collections` | Create collection |

### NFTs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/nfts` | List NFTs with filters |
| GET | `/nfts/:id` | NFT details |
| GET | `/nfts/:id/activity` | NFT activity history |
| POST | `/nfts/register` | Register minted NFT |

### Trading
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/listings` | Active listings |
| POST | `/listings` | Create listing |
| GET | `/auctions` | Active auctions |
| GET | `/auctions/:id` | Auction details with bids |
| GET | `/offers/nft/:addr/:tokenId` | Offers on an NFT |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search?q={query}` | Search collections & NFTs |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/:address` | User profile |
| PATCH | `/users/me` | Update profile |

---

## Project Structure

```
Sierra/
├── contracts/                # Solidity smart contracts
│   ├── SharedNFT721.sol      # ERC-721 factory
│   ├── SharedNFT1155.sol     # ERC-1155 factory
│   ├── Marketplace.sol       # ERC-721 marketplace
│   ├── Marketplace1155.sol   # ERC-1155 marketplace
│   ├── Auction.sol           # English auction
│   └── Offers.sol            # Offer system
├── backend/                  # NestJS API server
│   └── src/
│       ├── auth/             # SIWE authentication
│       ├── collection/       # Collection management
│       ├── nft/              # NFT data & metadata
│       ├── listing/          # Marketplace listings
│       ├── auction/          # Auction system
│       ├── offer/            # Offer system
│       ├── admin/            # Admin panel API
│       ├── search/           # Full-text search
│       ├── user/             # User profiles
│       ├── indexer/          # Blockchain event indexer
│       ├── ipfs/             # Pinata/IPFS integration
│       ├── report/           # Content reporting
│       └── metrics/          # Analytics
├── frontend/                 # Next.js application
│   └── src/
│       ├── app/              # Pages & routes
│       ├── components/       # React components
│       ├── hooks/            # Custom hooks
│       ├── lib/              # Utilities & contract ABIs
│       ├── store/            # Zustand state stores
│       └── types/            # TypeScript types
├── scripts/                  # Deployment scripts
├── deployments/              # Contract addresses
└── hardhat.config.ts         # Hardhat configuration
```

---

## Network Information

| Network | Chain ID | RPC URL |
|---------|----------|---------|
| WorldLand Mainnet | 103 | `https://seoul.worldland.foundation` |
| WorldLand Testnet | 10395 | `https://gwangju.worldland.foundation` |

**Block Explorer:** [https://scan.worldland.foundation](https://scan.worldland.foundation)

---

## License

This project is proprietary software developed by ForrestCrew.

---

<p align="center">
  Built with purpose on <strong>WorldLand</strong>
</p>
