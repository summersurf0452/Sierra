/**
 * WorldLand NFT Generator - Entry Point
 *
 * Usage: node src/main.js
 */

const fs = require("fs-extra");
const path = require("path");
const {
  outputDir,
  layerConfigurations,
  collectionName,
  shuffleLayerConfigurations,
} = require("./config");
const { generateEditions, dnaSet } = require("./engine");
const { saveCollectionMetadata } = require("./metadata");

async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║   WorldLand NFT Generative Engine      ║");
  console.log("╚════════════════════════════════════════╝");
  console.log();

  // Clean output directory
  console.log("🗂  Cleaning output directory...");
  await fs.emptyDir(path.join(outputDir, "images"));
  await fs.emptyDir(path.join(outputDir, "metadata"));

  const configs = shuffleLayerConfigurations
    ? [...layerConfigurations].sort(() => Math.random() - 0.5)
    : layerConfigurations;

  let startEdition = 1;
  const allMetadata = [];

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const layers = config.layersOrder.map((l) => l.name).join(", ");
    console.log(
      `\n🎨 Config ${i + 1}/${configs.length}: editions ${startEdition}-${config.growEditionSizeTo}`
    );
    console.log(`   Layers: [${layers}]`);

    const metadata = await generateEditions(config, startEdition);
    allMetadata.push(...metadata);
    startEdition = config.growEditionSizeTo + 1;
  }

  // Save combined metadata
  await saveCollectionMetadata(allMetadata);

  console.log("\n════════════════════════════════════════════");
  console.log(`✅ Done! Generated ${allMetadata.length} unique ${collectionName} NFTs`);
  console.log(`   Images:   ${path.join(outputDir, "images")}`);
  console.log(`   Metadata: ${path.join(outputDir, "metadata")}`);
  console.log(`   Unique DNAs: ${dnaSet.size}`);
  console.log("════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("\n❌ Generation failed:", err.message);
  process.exit(1);
});
