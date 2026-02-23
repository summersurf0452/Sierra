/**
 * Update PALEMAN Collection metadata on Metaplex Core
 * Fixes: collection URI must be HTTP, not ipfs://
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { updateCollectionV1, mplCore, fetchCollectionV1 } from '@metaplex-foundation/mpl-core';
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDevnet = process.argv.includes('--devnet');
const RPC_URL = isDevnet
  ? 'https://api.devnet.solana.com'
  : 'https://api.mainnet-beta.solana.com';

// Load keypair
const keypairFile = isDevnet
  ? path.join(__dirname, 'devnet-keypair.json')
  : path.join(__dirname, 'mainnet-keypair.json');

const keypairData = JSON.parse(fs.readFileSync(keypairFile, 'utf8'));

// Load state
const stateFile = path.join(__dirname, `core-state-${isDevnet ? 'devnet' : 'mainnet'}.json`);
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

const COLLECTION_ADDRESS = state.collectionAddress;
// Use the first NFT's image as collection image, with proper HTTP gateway URL
const COLLECTION_METADATA_URI = 'https://gateway.pinata.cloud/ipfs/bafkreifrpser27styyonvt6bh5civ6yaq2uugn4kja5svrxb3nco2zoh5q';

console.log(`\n🔧 Updating Collection Metadata`);
console.log(`   Network: ${isDevnet ? 'DEVNET' : 'MAINNET'}`);
console.log(`   Collection: ${COLLECTION_ADDRESS}\n`);

const umi = createUmi(RPC_URL).use(mplCore());
const keypairUint8 = new Uint8Array(keypairData);
const signer = umi.eddsa.createKeypairFromSecretKey(keypairUint8);
umi.use(keypairIdentity(signer));

async function main() {
  const collectionPk = publicKey(COLLECTION_ADDRESS);

  // Fetch current collection
  const collection = await fetchCollectionV1(umi, collectionPk);
  console.log('Current name:', collection.name);
  console.log('Current URI:', collection.uri);

  // Update with proper metadata
  await updateCollectionV1(umi, {
    collection: collectionPk,
    name: 'PALEMAN',
    uri: COLLECTION_METADATA_URI,
  }).sendAndConfirm(umi);

  console.log('\n✅ Collection updated!');
  console.log('   Name: PALEMAN');
  console.log(`   URI: ${COLLECTION_METADATA_URI}`);

  // Verify
  const updated = await fetchCollectionV1(umi, collectionPk);
  console.log('\nVerification:');
  console.log('   Name:', updated.name);
  console.log('   URI:', updated.uri);
}

main().catch(console.error);
