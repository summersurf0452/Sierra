/**
 * PALEMAN NFT Collection — Solana Metaplex Deployment
 *
 * Standard: Metaplex Token Metadata (mpl-token-metadata)
 * Flow:
 *   1. Create Collection NFT
 *   2. Mint individual NFTs into that collection
 *
 * Usage:
 *   node deploy.mjs                    # deploy to devnet
 *   node deploy.mjs --mainnet          # deploy to mainnet
 *   node deploy.mjs --mint-only        # skip collection creation (resume)
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  createNft,
  mplTokenMetadata,
  verifyCollectionV1,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey,
} from '@metaplex-foundation/umi';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────
const isMainnet = process.argv.includes('--mainnet');
const mintOnly = process.argv.includes('--mint-only');
const RPC_URL = isMainnet
  ? 'https://api.mainnet-beta.solana.com'
  : 'https://api.devnet.solana.com';

const COLLECTION_NAME = 'PALEMAN';
const COLLECTION_SYMBOL = 'PALE';
const COLLECTION_DESCRIPTION = "paleman don't want to be pale";
const SELLER_FEE_BASIS_POINTS = 500; // 5% royalty
const CREATOR_ADDRESS = 'DtWXV6gqqTbMNnTPinF8xdFCBhwVsfzNzBBHXbCs71s7';

// State file for resume capability
const STATE_FILE = path.join(__dirname, `deploy-state-${isMainnet ? 'mainnet' : 'devnet'}.json`);

// ── Load keypair ────────────────────────────────────────────
const keypairFile = isMainnet
  ? path.join(__dirname, 'mainnet-keypair.json')
  : path.join(__dirname, 'devnet-keypair.json');

if (!fs.existsSync(keypairFile)) {
  console.error(`Keypair file not found: ${keypairFile}`);
  console.error('Generate one with: solana-keygen new --outfile ' + keypairFile);
  process.exit(1);
}

const keypairData = JSON.parse(fs.readFileSync(keypairFile, 'utf8'));

// ── Load NFT data ───────────────────────────────────────────
const nftDataFile = path.join(__dirname, 'paleman-nfts.txt');
const nftLines = fs.readFileSync(nftDataFile, 'utf8').trim().split('\n');
const nfts = nftLines.map((line) => {
  const [name, imageUrl, tokenURI] = line.split('|');
  // Convert ipfs:// tokenURI to HTTP for Solana metadata
  const metadataUri = tokenURI.startsWith('ipfs://')
    ? 'https://gateway.pinata.cloud/ipfs/' + tokenURI.replace('ipfs://', '')
    : tokenURI;
  return { name: name || `PALEMAN #${nfts?.length || 0}`, imageUrl, metadataUri };
});

console.log(`\n🎨 PALEMAN NFT Deployment`);
console.log(`   Network: ${isMainnet ? '🔴 MAINNET' : '🟢 DEVNET'}`);
console.log(`   NFTs to mint: ${nfts.length}`);
console.log(`   RPC: ${RPC_URL}\n`);

// ── Initialize Umi ──────────────────────────────────────────
const umi = createUmi(RPC_URL).use(mplTokenMetadata());

// Set keypair identity
const keypairUint8 = new Uint8Array(keypairData);
const signer = umi.eddsa.createKeypairFromSecretKey(keypairUint8);
umi.use(keypairIdentity(signer));

console.log(`🔑 Deployer: ${signer.publicKey}`);

// ── State management ────────────────────────────────────────
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return { collectionMint: null, mintedNfts: [] };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Deploy ──────────────────────────────────────────────────
async function main() {
  const state = loadState();

  // Check balance
  const balance = await umi.rpc.getBalance(signer.publicKey);
  console.log(`💰 Balance: ${Number(balance.basisPoints) / 1e9} SOL\n`);

  if (Number(balance.basisPoints) < 0.1 * 1e9) {
    console.error('❌ Insufficient balance. Need at least 0.1 SOL.');
    if (!isMainnet) {
      console.log('   Run: solana airdrop 2');
    }
    process.exit(1);
  }

  // Step 1: Create Collection NFT
  if (!state.collectionMint && !mintOnly) {
    console.log('📦 Creating Collection NFT...');
    const collectionMint = generateSigner(umi);

    await createNft(umi, {
      mint: collectionMint,
      name: COLLECTION_NAME,
      symbol: COLLECTION_SYMBOL,
      uri: nfts[0].metadataUri, // Use first NFT metadata as collection metadata
      sellerFeeBasisPoints: percentAmount(SELLER_FEE_BASIS_POINTS / 100),
      isCollection: true,
      creators: [
        {
          address: publicKey(CREATOR_ADDRESS),
          verified: false,
          share: 100,
        },
      ],
    }).sendAndConfirm(umi);

    state.collectionMint = collectionMint.publicKey.toString();
    saveState(state);

    console.log(`✅ Collection created!`);
    console.log(`   Collection Mint: ${state.collectionMint}\n`);
  } else if (state.collectionMint) {
    console.log(`📦 Collection already exists: ${state.collectionMint}\n`);
  }

  if (!state.collectionMint) {
    console.error('❌ No collection mint found. Run without --mint-only first.');
    process.exit(1);
  }

  // Step 2: Mint individual NFTs
  const collectionMintPk = publicKey(state.collectionMint);
  const alreadyMinted = new Set(state.mintedNfts.map((n) => n.index));

  for (let i = 0; i < nfts.length; i++) {
    if (alreadyMinted.has(i)) {
      console.log(`⏭️  NFT #${i + 1} already minted, skipping`);
      continue;
    }

    const nft = nfts[i];
    console.log(`🖼️  Minting NFT #${i + 1}/${nfts.length}: ${nft.name}...`);

    try {
      const nftMint = generateSigner(umi);

      await createNft(umi, {
        mint: nftMint,
        name: nft.name,
        symbol: COLLECTION_SYMBOL,
        uri: nft.metadataUri,
        sellerFeeBasisPoints: percentAmount(SELLER_FEE_BASIS_POINTS / 100),
        collection: {
          key: collectionMintPk,
          verified: false,
        },
        creators: [
          {
            address: publicKey(CREATOR_ADDRESS),
            verified: false,
            share: 100,
          },
        ],
      }).sendAndConfirm(umi);

      // Verify collection (authority must match)
      try {
        await verifyCollectionV1(umi, {
          metadata: nftMint.publicKey, // will be derived
          collectionMint: collectionMintPk,
        }).sendAndConfirm(umi);
      } catch (verifyErr) {
        console.log(`   ⚠️  Collection verification skipped: ${verifyErr.message}`);
      }

      state.mintedNfts.push({
        index: i,
        name: nft.name,
        mint: nftMint.publicKey.toString(),
      });
      saveState(state);

      console.log(`   ✅ Minted: ${nftMint.publicKey}`);
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
      // Save state and continue
      saveState(state);
    }

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n🎉 Deployment complete!`);
  console.log(`   Collection: ${state.collectionMint}`);
  console.log(`   Minted: ${state.mintedNfts.length}/${nfts.length} NFTs`);
  console.log(`   State saved to: ${STATE_FILE}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
