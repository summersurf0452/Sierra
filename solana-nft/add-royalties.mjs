/**
 * Add Royalties plugin to PALEMAN collection (Metaplex Core)
 * Sets 5% royalty to creator DtWXV6g...
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  addCollectionPluginV1,
  ruleSet,
  mplCore,
} from '@metaplex-foundation/mpl-core';
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const CREATOR = 'DtWXV6gqqTbMNnTPinF8xdFCBhwVsfzNzBBHXbCs71s7';
const ROYALTY_PERCENT = 5; // 5%

async function main() {
  const collPk = publicKey(state.collectionAddress);
  console.log(`\n🔧 Adding Royalties Plugin to PALEMAN Collection`);
  console.log(`   Collection: ${state.collectionAddress}`);
  console.log(`   Royalty: ${ROYALTY_PERCENT}%`);
  console.log(`   Creator: ${CREATOR}\n`);

  await addCollectionPluginV1(umi, {
    collection: collPk,
    plugin: {
      __kind: 'Royalties',
      fields: [{
        basisPoints: ROYALTY_PERCENT * 100,
        creators: [
          {
            address: publicKey(CREATOR),
            percentage: 100,
          },
        ],
        ruleSet: ruleSet('None'),
      }],
    },
  }).sendAndConfirm(umi);

  console.log('✅ Royalties plugin added!');
  console.log(`   ${ROYALTY_PERCENT}% royalty → ${CREATOR}`);
}

main().catch(console.error);
