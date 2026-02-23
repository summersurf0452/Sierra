/**
 * WorldLand NFT Generator - Metadata Generator
 *
 * Creates ERC-721 / OpenSea compatible JSON metadata files.
 */

const fs = require("fs-extra");
const path = require("path");
const { outputDir, collectionName, description, baseUri } = require("./config");

const metadataDir = path.join(outputDir, "metadata");

/**
 * Build a single token's metadata object.
 * @param {number} edition - Token edition number (1-based)
 * @param {Array<{layerName: string, variantName: string}>} selectedLayers
 * @returns {object} ERC-721 metadata object
 */
function buildMetadata(edition, selectedLayers) {
  const attributes = selectedLayers
    .filter((l) => l.variantName !== "None")
    .map((l) => ({
      trait_type: l.layerName,
      value: l.variantName,
    }));

  return {
    name: `${collectionName} #${edition}`,
    description,
    image: `${baseUri}/${edition}.png`,
    edition,
    attributes,
  };
}

/**
 * Write metadata JSON to disk.
 * @param {number} edition
 * @param {object} metadata
 */
async function saveMetadata(edition, metadata) {
  await fs.ensureDir(metadataDir);
  const filePath = path.join(metadataDir, `${edition}.json`);
  await fs.writeJson(filePath, metadata, { spaces: 2 });
}

/**
 * Write the combined _metadata.json collection file.
 * @param {Array<object>} allMetadata
 */
async function saveCollectionMetadata(allMetadata) {
  await fs.ensureDir(metadataDir);
  const filePath = path.join(metadataDir, "_metadata.json");
  await fs.writeJson(filePath, allMetadata, { spaces: 2 });
}

module.exports = {
  buildMetadata,
  saveMetadata,
  saveCollectionMetadata,
};
