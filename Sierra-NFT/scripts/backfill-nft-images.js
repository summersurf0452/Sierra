const path = require('path');
const backendDir = path.join(__dirname, '..', 'backend');
const { Client } = require(path.join(backendDir, 'node_modules', 'pg'));
const fs = require('fs');

const env = {};
const envPath = path.join(backendDir, '.env');
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
});

(async () => {
  const client = new Client({
    host: env.DB_HOST,
    port: env.DB_PORT || 5432,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
  });
  await client.connect();
  console.log('Connected to DB');

  const { rows } = await client.query(
    `SELECT id, "tokenURI" FROM nfts WHERE ("imageUrl" IS NULL OR "imageUrl" = '') AND "tokenURI" IS NOT NULL`
  );
  console.log('NFTs to backfill:', rows.length);

  let updated = 0;
  for (const row of rows) {
    try {
      let url = row.tokenURI;
      if (url.startsWith('ipfs://')) {
        url = 'https://gateway.pinata.cloud/ipfs/' + url.replace('ipfs://', '');
      }
      const res = await fetch(url);
      const json = await res.json();

      let imageUrl = json.image || null;
      if (imageUrl && imageUrl.startsWith('ipfs://')) {
        imageUrl = 'https://gateway.pinata.cloud/ipfs/' + imageUrl.replace('ipfs://', '');
      }

      await client.query(
        `UPDATE nfts SET "imageUrl" = $1, name = COALESCE(NULLIF(name, ''), $2), description = COALESCE(NULLIF(description, ''), $3) WHERE id = $4`,
        [imageUrl, json.name || null, json.description || null, row.id]
      );
      updated++;
      console.log(`Updated ${updated}/${rows.length} - ${json.name}`);
    } catch (e) {
      console.error('Fail:', row.id, e.message);
    }
  }
  console.log('Done. Updated:', updated);
  await client.end();
})();
