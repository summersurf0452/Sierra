/**
 * WorldLand NFT Generator - Configuration
 *
 * Layer folder naming convention:
 *   layers/{order}-{LayerName}/
 *     {VariantName}#{weight}.png
 *
 * Higher weight = more common.
 * Lower weight = more rare.
 */

const path = require("path");

// ─── Paths ────────────────────────────────────────────────
const basePath = path.resolve(__dirname, "..");
const layersDir = path.join(basePath, "layers");
const outputDir = path.join(basePath, "output");

// ─── Image Format ─────────────────────────────────────────
const format = {
  width: 1000,
  height: 1000,
  smoothing: true,
};

// ─── Collection Info ──────────────────────────────────────
const collectionName = "WorldLand NFT";
const description = "A unique WorldLand generative NFT";
const baseUri = "ipfs://REPLACE_WITH_YOUR_CID";

// ─── Layer Configurations ─────────────────────────────────
// You can define multiple configs to create "series" with
// different layer combos. growEditionSizeTo is cumulative.
const layerConfigurations = [
  {
    growEditionSizeTo: 20, // generate 20 NFTs
    layersOrder: [
      { name: "Background" },
      { name: "Body" },
      { name: "Face", blend: "screen" },
      { name: "Mouth", blend: "screen" },
      { name: "Eyes", blend: "screen" },
      { name: "Head", blend: "screen" },
    ],
  },
];

// ─── Generation Settings ──────────────────────────────────
const shuffleLayerConfigurations = false;
const debugLogs = true;

// ─── Rarity Delimiter ─────────────────────────────────────
// Character that separates variant name from weight in filename
// e.g. "Blue#30.png" → name="Blue", weight=30
const rarityDelimiter = "#";

// Default weight when no delimiter is found in filename
const defaultWeight = 50;

module.exports = {
  basePath,
  layersDir,
  outputDir,
  format,
  collectionName,
  description,
  baseUri,
  layerConfigurations,
  shuffleLayerConfigurations,
  debugLogs,
  rarityDelimiter,
  defaultWeight,
};
