const { createCanvas, loadImage } = require("@napi-rs/canvas");
const fs = require("fs");
const path = require("path");

const width = 1000;
const height = 1000;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

async function run() {
  try {
    // 1. Load Background (Opague)
    console.log("Loading Background...");
    const bgBuffer = fs.readFileSync(path.resolve(__dirname, "../layers/1-Background/DarkCrimson#30.png"));
    const bg = await loadImage(bgBuffer);
    ctx.drawImage(bg, 0, 0, width, height);

    // 2. Load Body (Opaque)
    console.log("Loading Body...");
    const bodyBuffer = fs.readFileSync(path.resolve(__dirname, "../layers/2-Body/PaleHuman#30.png"));
    const body = await loadImage(bodyBuffer);
    ctx.drawImage(body, 0, 0, width, height);

    // 3. Load Face (Screen)
    console.log("Loading Face (Veins)...");
    const faceBuffer = fs.readFileSync(path.resolve(__dirname, "../layers/3-Face/Veins#15.png"));
    const face = await loadImage(faceBuffer);
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(face, 0, 0, width, height);

    // 4. Load Eyes (Screen)
    console.log("Loading Eyes (VerticalSlit)...");
    const eyesBuffer = fs.readFileSync(path.resolve(__dirname, "../layers/5-Eyes/VerticalSlit#25.png"));
    const eyes = await loadImage(eyesBuffer);
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(eyes, 0, 0, width, height);

    // 5. Load Head (Screen)
    console.log("Loading Head (HaloRing)...");
    const headBuffer = fs.readFileSync(path.resolve(__dirname, "../layers/6-Head/HaloRing#20.png"));
    const head = await loadImage(headBuffer);
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(head, 0, 0, width, height);

    // Save
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync("preview_test.png", buffer);
    console.log("Saved preview_test.png");

  } catch (err) {
    console.error(err);
  }
}

run();
