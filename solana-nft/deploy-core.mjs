/**
 * PALEMAN NFT Collection — Metaplex Core (Mainnet)
 *
 * Standard: Metaplex Core (mpl-core)
 * Flow:
 *   1. Create Collection (Certified Collection Address)
 *   2. Mint individual NFTs into that collection
 *
 * Usage:
 *   node deploy-core.mjs                  # mainnet (default)
 *   node deploy-core.mjs --devnet         # devnet test
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  createCollectionV1,
  createV1,
  mplCore,
} from '@metaplex-foundation/mpl-core';
import {
  generateSigner,
  keypairIdentity,
  publicKey,
} from '@metaplex-foundation/umi';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────
const isDevnet = process.argv.includes('--devnet');
const RPC_URL = isDevnet
  ? 'https://api.devnet.solana.com'
  : 'https://api.mainnet-beta.solana.com';

const COLLECTION_NAME = 'PALEMAN';
const COLLECTION_DESCRIPTION = "paleman don't want to be pale";
const ROYALTY_BPS = 500; // 5%
const CREATOR_ADDRESS = 'DtWXV6gqqTbMNnTPinF8xdFCBhwVsfzNzBBHXbCs71s7';

const STATE_FILE = path.join(__dirname, `core-state-${isDevnet ? 'devnet' : 'mainnet'}.json`);

// ── Load keypair ────────────────────────────────────────────
// For mainnet: place your keypair at solana-nft/mainnet-keypair.json
// For devnet:  solana-nft/devnet-keypair.json
const keypairFile = isDevnet
  ? path.join(__dirname, 'devnet-keypair.json')
  : path.join(__dirname, 'mainnet-keypair.json');

if (!fs.existsSync(keypairFile)) {
  console.error(`❌ Keypair file not found: ${keypairFile}`);
  console.error(`   Export your wallet private key as JSON array and save it there.`);
  console.error(`   Example: solana-keygen new --outfile ${keypairFile}`);
  process.exit(1);
}

const keypairData = JSON.parse(fs.readFileSync(keypairFile, 'utf8'));

// ── Load NFT data ───────────────────────────────────────────
const nftDataFile = path.join(__dirname, 'paleman-nfts.txt');
const nftLines = fs.readFileSync(nftDataFile, 'utf8').trim().split('\n');
const nfts = nftLines.map((line, idx) => {
  const [name, imageUrl, tokenURI] = line.split('|');
  const metadataUri = tokenURI.startsWith('ipfs://')
    ? 'https://gateway.pinata.cloud/ipfs/' + tokenURI.replace('ipfs://', '')
    : tokenURI;
  return { name: name || `PALEMAN #${idx + 1}`, imageUrl, metadataUri };
});

console.log(`\n🎨 PALEMAN — Metaplex Core Deployment`);
console.log(`   Network: ${isDevnet ? '🟢 DEVNET' : '🔴 MAINNET'}`);
console.log(`   NFTs to mint: ${nfts.length}`);
console.log(`   RPC: ${RPC_URL}\n`);

// ── Initialize Umi ──────────────────────────────────────────
const umi = createUmi(RPC_URL).use(mplCore());

const keypairUint8 = new Uint8Array(keypairData);
const signer = umi.eddsa.createKeypairFromSecretKey(keypairUint8);
umi.use(keypairIdentity(signer));

console.log(`🔑 Deployer: ${signer.publicKey}`);

// ── State management (resume support) ───────────────────────
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return { collectionAddress: null, mintedNfts: [] };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Deploy ──────────────────────────────────────────────────
async function main() {
  const state = loadState();

  // Check balance
  const balance = await umi.rpc.getBalance(signer.publicKey);
  const solBalance = Number(balance.basisPoints) / 1e9;
  console.log(`💰 Balance: ${solBalance} SOL\n`);

  if (solBalance < 0.05) {
    console.error('❌ Insufficient balance.');
    process.exit(1);
  }

  // Step 1: Create Collection (Metaplex Certified Collection)
  if (!state.collectionAddress) {
    console.log('📦 Creating Metaplex Core Collection...');
    const collectionSigner = generateSigner(umi);

    await createCollectionV1(umi, {
      collection: collectionSigner,
      name: COLLECTION_NAME,
      uri: nfts[0].metadataUri,
    }).sendAndConfirm(umi);

    state.collectionAddress = collectionSigner.publicKey.toString();
    saveState(state);

    console.log(`✅ Collection created!`);
    console.log(`   📋 Collection Address: ${state.collectionAddress}`);
    console.log(`   (This is your Metaplex Certified Collection Address)\n`);
  } else {
    console.log(`📦 Collection exists: ${state.collectionAddress}\n`);
  }

  // Step 2: Mint individual NFTs into collection
  const collectionPk = publicKey(state.collectionAddress);
  const alreadyMinted = new Set(state.mintedNfts.map((n) => n.index));

  for (let i = 0; i < nfts.length; i++) {
    if (alreadyMinted.has(i)) {
      console.log(`⏭️  #${i + 1} already minted`);
      continue;
    }

    const nft = nfts[i];
    console.log(`🖼️  Minting #${i + 1}/${nfts.length}: ${nft.name}...`);

    try {
      const assetSigner = generateSigner(umi);

      await createV1(umi, {
        asset: assetSigner,
        name: nft.name,
        uri: nft.metadataUri,
        collection: collectionPk,
      }).sendAndConfirm(umi);

      state.mintedNfts.push({
        index: i,
        name: nft.name,
        asset: assetSigner.publicKey.toString(),
      });
      saveState(state);

      console.log(`   ✅ ${assetSigner.publicKey}`);
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
      saveState(state);
    }

    // Rate limit protection
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n🎉 Deployment complete!`);
  console.log(`   Collection Address: ${state.collectionAddress}`);
  console.log(`   Minted: ${state.mintedNfts.length}/${nfts.length} NFTs`);
  console.log(`   State: ${STATE_FILE}`);
  console.log(`\n📌 Use this Collection Address on Magic Eden:`);
  console.log(`   ${state.collectionAddress}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
