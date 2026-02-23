/**
 * Update all minted NFT URIs to S3 metadata
 * Also updates collection URI
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  updateCollectionV1,
  updateV1,
  fetchAssetV1,
  fetchCollectionV1,
  mplCore,
} from '@metaplex-foundation/mpl-core';
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const S3_BASE = 'https://sierra-nft-images.s3.ap-northeast-2.amazonaws.com/paleman-metadata';

const isDevnet = process.argv.includes('--devnet');
const RPC_URL = isDevnet
  ? 'https://api.devnet.solana.com'
  : 'https://api.mainnet-beta.solana.com';

const keypairFile = isDevnet
  ? path.join(__dirname, 'devnet-keypair.json')
  : path.join(__dirname, 'mainnet-keypair.json');
const keypairData = JSON.parse(fs.readFileSync(keypairFile, 'utf8'));

const stateFile = path.join(__dirname, `core-state-${isDevnet ? 'devnet' : 'mainnet'}.json`);
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

const umi = createUmi(RPC_URL).use(mplCore());
const keypairUint8 = new Uint8Array(keypairData);
const signer = umi.eddsa.createKeypairFromSecretKey(keypairUint8);
umi.use(keypairIdentity(signer));

async function main() {
  console.log(`\n🔧 Updating URIs to S3 (${isDevnet ? 'devnet' : 'mainnet'})`);
  console.log(`   Collection: ${state.collectionAddress}`);
  console.log(`   NFTs to update: ${state.mintedNfts.length}\n`);

  // 1. Update collection URI
  console.log('📦 Updating collection URI...');
  const collPk = publicKey(state.collectionAddress);
  await updateCollectionV1(umi, {
    collection: collPk,
    name: 'PALEMAN',
    uri: `${S3_BASE}/collection.json`,
  }).sendAndConfirm(umi);
  console.log(`   ✅ Collection URI: ${S3_BASE}/collection.json\n`);

  // 2. Update each minted NFT
  for (const nft of state.mintedNfts) {
    const nftIdx = nft.index + 1; // 1-based
    const newUri = `${S3_BASE}/${nftIdx}.json`;
    const newName = `PALEMAN #${nftIdx}`;
    const assetPk = publicKey(nft.asset);

    try {
      await updateV1(umi, {
        asset: assetPk,
        collection: collPk,
        name: newName,
        uri: newUri,
      }).sendAndConfirm(umi);
      console.log(`   ✅ #${nftIdx} ${newName} → ${newUri}`);
    } catch (err) {
      console.error(`   ❌ #${nftIdx} failed: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('\n🎉 All URIs updated to S3!');
}

main().catch(console.error);
