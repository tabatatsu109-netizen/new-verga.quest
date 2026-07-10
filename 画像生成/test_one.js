// generate.js と同じロジックで、1枚だけ試し生成するテスト用スクリプト
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const INPUT_DIR = path.join(ROOT, "入力画像");
const OUTPUT_DIR = path.join(ROOT, "出力画像");
const MODEL = "gpt-image-1";
const SIZE = "1536x1024";
const QUALITY = "high";

const COMMON_PROMPT = `
This is an edit of the attached reference photograph. Preserve the exact same camera angle, framing, composition, and perspective as the reference image. Preserve the exact same physical structures shown in the reference — buildings, terrain, rivers, rocks, trees, paths, entrances, windows, glass dome structures, stone walls, waterfalls, and any other architectural or natural features must keep the same shape, position, and scale as in the reference photo. Do not change this into a different location.
Render as a photorealistic photograph of the real world — absolutely not an illustration, not anime, not a cartoon, not a painting, not stylized artwork.
Do not add any people, human figures, or characters. Do not add any text, logos, captions, signage, watermarks, game UI elements, or decorative frames anywhere in the image. Do not render any Japanese or English letters, numbers, or writing of any kind anywhere in the image.
The image must be suitable for use as a widescreen video game background. Keep all differences from the reference limited strictly to lighting, atmosphere, and time of day — do not otherwise alter the buildings or terrain. Avoid making the overall image excessively blue-tinted or excessively dark.
`.trim();

const PATTERN_NAME = "朝";
const PATTERN_PROMPT = `Time of day: early morning. Soft, gentle morning sunlight at a low angle. A light, thin morning mist drifting close to the ground. Fresh, crisp, clean air. Natural, soft brightness — not dark, not harsh, not overexposed.`;

const INPUT_FILE = "尾白川.png";

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { console.error("OPENAI_API_KEY未設定"); process.exit(1); }

  const inputPath = path.join(INPUT_DIR, INPUT_FILE);
  const buf = fs.readFileSync(inputPath);
  const prompt = `${COMMON_PROMPT}\n\n${PATTERN_PROMPT}`;

  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", prompt);
  form.append("size", SIZE);
  form.append("quality", QUALITY);
  form.append("image", new Blob([buf], { type: mimeFor(INPUT_FILE) }), INPUT_FILE);

  console.log("生成中... (30〜60秒ほどかかります)");
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`HTTP ${res.status}:`, text.slice(0, 1000));
    process.exit(1);
  }
  const json = await res.json();
  const b64 = json.data && json.data[0] && json.data[0].b64_json;
  if (!b64) { console.error("no b64_json", JSON.stringify(json).slice(0,500)); process.exit(1); }

  const outDir = path.join(OUTPUT_DIR, path.parse(INPUT_FILE).name);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${PATTERN_NAME}.png`);
  const imgBuf = Buffer.from(b64, "base64");
  fs.writeFileSync(outPath, imgBuf);
  console.log(`保存しました: ${outPath} (${(imgBuf.length/1024).toFixed(0)}KB)`);
}

main().catch(e => { console.error("エラー:", e); process.exit(1); });
