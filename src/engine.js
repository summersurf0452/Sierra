/**
 * WorldLand NFT Generator - Core Engine
 *
 * Handles:
 *  - Loading layer assets from the filesystem
 *  - Weighted random selection of variants
 *  - DNA-based uniqueness enforcement
 *  - Image composition via node-canvas
 */

const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const {
  layersDir,
  outputDir,
  format,
  rarityDelimiter,
  defaultWeight,
  debugLogs,
} = require("./config");
const { buildMetadata, saveMetadata } = require("./metadata");

const imagesDir = path.join(outputDir, "images");

// ─── DNA Set (uniqueness) ─────────────────────────────────
const dnaSet = new Set();

// ─── Layer Loading ────────────────────────────────────────

/**
 * Parse a single variant filename into name + weight.
 * e.g. "Blue#30.png" → { name: "Blue", weight: 30, file: "Blue#30.png" }
 */
function parseVariantFile(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);

  if (base.includes(rarityDelimiter)) {
    const parts = base.split(rarityDelimiter);
    const weight = parseInt(parts.pop(), 10);
    const name = parts.join(rarityDelimiter);
    return { name, weight: isNaN(weight) ? defaultWeight : weight, file: filename };
  }

  return { name: base, weight: defaultWeight, file: filename };
}

/**
 * Load all variants for a given layer.
 * @param {string} layerName - e.g. "Background" (folder may be "1-Background")
 * @returns {Array<{name, weight, file, path}>}
 */
function loadLayerVariants(layerName) {
  // Find the folder that ends with the layer name (prefix is sort order)
  const entries = fs.readdirSync(layersDir);
  const folder = entries.find((e) => {
    const stripped = e.replace(/^\d+-/, "");
    return stripped === layerName;
  });

  if (!folder) {
    throw new Error(`Layer folder not found for "${layerName}" in ${layersDir}`);
  }

  const folderPath = path.join(layersDir, folder);
  const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".png"));

  if (files.length === 0) {
    throw new Error(`No PNG files found in ${folderPath}`);
  }

  return files.map((f) => {
    const variant = parseVariantFile(f);
    variant.path = path.join(folderPath, f);
    return variant;
  });
}

// ─── Weighted Random Selection ────────────────────────────

/**
 * Pick one variant from a list using weighted random selection.
 * @param {Array<{name, weight, file, path}>} variants
 * @param {boolean} optional - if true, "None" is a possible outcome
 * @returns {{name, weight, file, path} | null}
 */
function pickWeightedRandom(variants, optional = false) {
  let pool = [...variants];

  // If the layer is optional, add a "None" pseudo-variant
  if (optional) {
    const avgWeight = Math.round(
      pool.reduce((sum, v) => sum + v.weight, 0) / pool.length
    );
    pool.push({ name: "None", weight: avgWeight, file: null, path: null });
  }

  const totalWeight = pool.reduce((sum, v) => sum + v.weight, 0);
  let rand = Math.random() * totalWeight;

  for (const variant of pool) {
    rand -= variant.weight;
    if (rand <= 0) return variant;
  }

  return pool[pool.length - 1]; // fallback
}

// ─── DNA ──────────────────────────────────────────────────

/**
 * Create a DNA string from selected layers.
 * @param {Array<{layerName, variantName}>} selections
 * @returns {string}
 */
function createDNA(selections) {
  return selections.map((s) => `${s.layerName}:${s.variantName}`).join("-");
}

/**
 * Check if a DNA already exists.
 */
function isDNAUnique(dna) {
  return !dnaSet.has(dna);
}

/**
 * Register a DNA.
 */
function addDNA(dna) {
  dnaSet.add(dna);
}

// ─── Image Composition ───────────────────────────────────

/**
 * Compose layers into a single image and save to disk.
 * @param {Array<{layerName, variantName, filePath}>} selections
 * @param {number} edition
 */
async function compositeImage(selections, edition) {
  const canvas = createCanvas(format.width, format.height);
  const ctx = canvas.getContext("2d");

  if (format.smoothing) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
  }

  for (const sel of selections) {
    if (!sel.filePath) continue; // skip "None" variants

    const img = await loadImage(sel.filePath);
    
    // Apply blending mode if specified
    if (sel.blend) {
      ctx.globalCompositeOperation = sel.blend;
    } else {
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.drawImage(img, 0, 0, format.width, format.height);
  }

  await fs.ensureDir(imagesDir);
  const out = path.join(imagesDir, `${edition}.png`);
  // buffer logic
  const buffer = canvas.toBuffer("image/png");
  if (debugLogs) console.log(`Saving to ${out}, buffer size: ${buffer.length}`);
  await fs.writeFile(out, buffer);
  if (debugLogs) console.log(`Saved ${out}`);
}

// ─── Main Generation Loop ────────────────────────────────

/**
 * Generate a batch of NFTs for one layer configuration.
 * @param {object} layerConfig - { growEditionSizeTo, layersOrder }
 * @param {number} startEdition - first edition number
 * @returns {Array<object>} metadata for all generated editions
 */
async function generateEditions(layerConfig, startEdition) {
  const { growEditionSizeTo, layersOrder } = layerConfig;
  const allMetadata = [];

  // Pre-load all layer variants
  const layerVariants = {};
  for (const layer of layersOrder) {
    layerVariants[layer.name] = loadLayerVariants(layer.name);
  }

  // Calculate the maximum possible unique combinations
  let maxCombinations = 1;
  for (const layer of layersOrder) {
    const variantCount = layerVariants[layer.name].length + (layer.optional ? 1 : 0);
    maxCombinations *= variantCount;
  }

  const editionsToGenerate = growEditionSizeTo - startEdition + 1;
  if (editionsToGenerate > maxCombinations) {
    throw new Error(
      `Cannot generate ${editionsToGenerate} unique NFTs. ` +
        `Maximum possible combinations: ${maxCombinations}. ` +
        `Add more layer variants or reduce the edition size.`
    );
  }

  let failedAttempts = 0;
  const maxFails = editionsToGenerate * 10; // safety limit

  for (let edition = startEdition; edition <= growEditionSizeTo; edition++) {
    let dna;
    let selections;

    // Pick layers until we get a unique DNA
    do {
      selections = [];
      for (const layer of layersOrder) {
        const variant = pickWeightedRandom(
          layerVariants[layer.name],
          layer.optional || false
        );
        selections.push({
          layerName: layer.name,
          variantName: variant.name,
          filePath: variant.path,
          blend: layer.blend || null, // Pass blend mode
        });
      }
      dna = createDNA(selections);
      failedAttempts++;

      if (failedAttempts > maxFails) {
        throw new Error(
          `Exceeded max retry attempts (${maxFails}). ` +
            `This usually means there are not enough unique combinations.`
        );
      }
    } while (!isDNAUnique(dna));

    addDNA(dna);

    // Compose image
    await compositeImage(selections, edition);

    // Build & save metadata
    const metadata = buildMetadata(edition, selections);
    await saveMetadata(edition, metadata);
    allMetadata.push(metadata);

    // Progress
    const total = growEditionSizeTo - startEdition + 1;
    const current = edition - startEdition + 1;
    process.stdout.write(`\r  Generating ${current}/${total}...`);

    if (debugLogs) {
      console.log(`\n  [DEBUG] #${edition} DNA: ${dna}`);
    }
  }

  console.log(""); // newline after progress
  return allMetadata;
}

module.exports = {
  generateEditions,
  parseVariantFile,
  loadLayerVariants,
  createDNA,
  dnaSet,
};
