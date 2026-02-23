/**
 * WorldLand NFT Generator - Verification Script
 *
 * Checks:
 *  1. No duplicate DNAs (trait combinations)
 *  2. All metadata files are valid JSON with required fields
 *  3. Image count matches metadata count
 *  4. Rarity distribution report
 *
 * Usage: node scripts/verify.js
 */

const fs = require("fs-extra");
const path = require("path");
const { outputDir } = require("../src/config");

const imagesDir = path.join(outputDir, "images");
const metadataDir = path.join(outputDir, "metadata");

async function verify() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║   NFT Collection Verification          ║");
  console.log("╚════════════════════════════════════════╝\n");

  let errors = 0;

  // 1. Count files
  const images = (await fs.readdir(imagesDir)).filter((f) => f.endsWith(".png"));
  const metaFiles = (await fs.readdir(metadataDir)).filter(
    (f) => f.endsWith(".json") && f !== "_metadata.json"
  );

  console.log(`📊 Images found:   ${images.length}`);
  console.log(`📊 Metadata found: ${metaFiles.length}`);

  if (images.length !== metaFiles.length) {
    console.log("❌ MISMATCH: image count !== metadata count");
    errors++;
  } else {
    console.log("✅ Image and metadata counts match");
  }

  // 2. Validate metadata + check uniqueness
  const dnaSet = new Set();
  const traitCounts = {}; // { traitType: { value: count } }

  for (const file of metaFiles) {
    const filePath = path.join(metadataDir, file);
    let meta;
    try {
      meta = await fs.readJson(filePath);
    } catch (e) {
      console.log(`❌ Invalid JSON: ${file}`);
      errors++;
      continue;
    }

    // Check required fields
    const required = ["name", "description", "image", "edition", "attributes"];
    for (const field of required) {
      if (!(field in meta)) {
        console.log(`❌ Missing field "${field}" in ${file}`);
        errors++;
      }
    }

    // Build DNA from attributes
    const dna = (meta.attributes || [])
      .map((a) => `${a.trait_type}:${a.value}`)
      .join("-");

    if (dnaSet.has(dna)) {
      console.log(`❌ DUPLICATE DNA found in ${file}: ${dna}`);
      errors++;
    }
    dnaSet.add(dna);

    // Collect trait stats
    for (const attr of meta.attributes || []) {
      if (!traitCounts[attr.trait_type]) traitCounts[attr.trait_type] = {};
      traitCounts[attr.trait_type][attr.value] =
        (traitCounts[attr.trait_type][attr.value] || 0) + 1;
    }
  }

  console.log(`✅ Unique DNAs: ${dnaSet.size}/${metaFiles.length}`);

  // 3. Check _metadata.json
  const collectionFile = path.join(metadataDir, "_metadata.json");
  if (await fs.pathExists(collectionFile)) {
    const collectionMeta = await fs.readJson(collectionFile);
    if (collectionMeta.length === metaFiles.length) {
      console.log("✅ _metadata.json collection file is valid");
    } else {
      console.log(
        `❌ _metadata.json has ${collectionMeta.length} entries but found ${metaFiles.length} individual files`
      );
      errors++;
    }
  } else {
    console.log("⚠️  _metadata.json not found");
  }

  // 4. Rarity distribution
  console.log("\n── Rarity Distribution ──────────────────\n");
  for (const [traitType, values] of Object.entries(traitCounts)) {
    console.log(`  ${traitType}:`);
    const total = Object.values(values).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(values).sort((a, b) => b[1] - a[1]);
    for (const [value, count] of sorted) {
      const pct = ((count / total) * 100).toFixed(1);
      const bar = "█".repeat(Math.round(pct / 3));
      console.log(`    ${value.padEnd(20)} ${String(count).padStart(4)} (${pct}%) ${bar}`);
    }
    console.log();
  }

  // Summary
  console.log("════════════════════════════════════════════");
  if (errors === 0) {
    console.log("✅ All checks passed! Collection is valid.");
  } else {
    console.log(`❌ ${errors} error(s) found. Please fix and re-run.`);
  }

  return errors;
}

verify()
  .then((errors) => process.exit(errors > 0 ? 1 : 0))
  .catch((err) => {
    console.error("Verification failed:", err.message);
    process.exit(1);
  });
