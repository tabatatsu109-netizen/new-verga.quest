// べるがクエスト 背景画像バリエーション量産ツール
// 入力画像/ 内の画像を1枚ずつ「朝・昼・夕方・夜・精霊世界」の5パターンに変換し、
// 出力画像/<元画像名>/<パターン名>.png として保存する。
//
// 使い方:
//   1) 環境変数 OPENAI_API_KEY を設定する
//   2) node generate.js
//
// すでに生成済みの出力ファイルはスキップするので、
// 入力画像/ に新しい画像を追加してから再実行すれば、その差分だけ生成される。

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const INPUT_DIR = path.join(ROOT, "入力画像");
const OUTPUT_DIR = path.join(ROOT, "出力画像");
const MODEL = "gpt-image-1";
const SIZE = "1536x1024";
const QUALITY = "high";
const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"];

const COMMON_PROMPT = `
This is an edit of the attached reference photograph. Preserve the exact same camera angle, framing, composition, and perspective as the reference image. Preserve the exact same physical structures shown in the reference — buildings, terrain, rivers, rocks, trees, paths, entrances, windows, glass dome structures, stone walls, waterfalls, and any other architectural or natural features must keep the same shape, position, and scale as in the reference photo. Do not change this into a different location.
Render as a photorealistic photograph of the real world — absolutely not an illustration, not anime, not a cartoon, not a painting, not stylized artwork.
Do not add any people, human figures, or characters. Do not add any text, logos, captions, signage, watermarks, game UI elements, or decorative frames anywhere in the image. Do not render any Japanese or English letters, numbers, or writing of any kind anywhere in the image.
The image must be suitable for use as a widescreen video game background. Keep all differences from the reference limited strictly to lighting, atmosphere, and time of day — do not otherwise alter the buildings or terrain. Avoid making the overall image excessively blue-tinted or excessively dark.
`.trim();

const PATTERNS = {
  "朝": `Time of day: early morning. Soft, gentle morning sunlight at a low angle. A light, thin morning mist drifting close to the ground. Fresh, crisp, clean air. Natural, soft brightness — not dark, not harsh, not overexposed.`,
  "昼": `Time of day: midday, clear sunny weather. Natural clear blue sky. Bright, direct sunlight. Dappled sunlight filtering through leaves (komorebi) wherever trees are present. This version should look the closest to how this real location actually appears on an ordinary clear day.`,
  "夕方": `Time of day: evening, golden hour just before sunset. Warm orange and amber sunset light raking across the scene. Long, soft shadows. If any buildings are visible, add a few softly glowing warm interior lights, used sparingly.`,
  "夜": `Time of day: night. Illuminated by moonlight. Not too dark — the terrain and buildings should still be clearly visible and readable. If any buildings are visible, add warm-colored interior lighting glowing gently from within. Add only a very small number of subtle, softly glowing pale blue-white floating light particles drifting in the air.`,
  "精霊世界": `Keep the real-world location about 90% intact and clearly recognizable as the same place. Add only a subtle 10% layer of fantasy elements on top: a small number of soft pale blue-white floating light particles, tiny faint glimmers suggesting hidden spirits, and understated, small magic-circle or geometric-pattern motifs worked subtly into the ground, stones, or air — restrained and secondary, never dominating the scene. These patterns must be purely abstract geometric shapes (circles, lines, dots) with absolutely no letters, characters, runes, glyphs, or writing of any kind. Do not add any stone markers, signposts, plaques, monuments, or engraved surfaces of any kind — no carved or engraved text anywhere in the image, in any language or invented script. The overall feeling should be as if another world is faintly overlapping with nature, glimpsed rather than obvious. Do NOT add any large fairies, human-like figures, or giant characters of any kind. Preserve the same structures, composition, and camera angle as the reference image.`,
};

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

async function generateOne(apiKey, inputPath, prompt) {
  const buf = fs.readFileSync(inputPath);
  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", prompt);
  form.append("size", SIZE);
  form.append("quality", QUALITY);
  form.append("image", new Blob([buf], { type: mimeFor(inputPath) }), path.basename(inputPath));

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = await res.json();
  const b64 = json.data && json.data[0] && json.data[0].b64_json;
  if (!b64) throw new Error("no b64_json in response: " + JSON.stringify(json).slice(0, 500));
  return Buffer.from(b64, "base64");
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("エラー: 環境変数 OPENAI_API_KEY が設定されていません。");
    process.exit(1);
  }
  if (!fs.existsSync(INPUT_DIR)) {
    console.error("入力画像フォルダが見つかりません: " + INPUT_DIR);
    process.exit(1);
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const inputFiles = fs
    .readdirSync(INPUT_DIR)
    .filter((f) => IMAGE_EXTS.includes(path.extname(f).toLowerCase()));

  if (inputFiles.length === 0) {
    console.log("入力画像フォルダに画像がありません。");
    return;
  }

  console.log(`対象画像: ${inputFiles.length}枚 (${inputFiles.join(", ")})`);
  console.log(`1枚につき ${Object.keys(PATTERNS).length}パターン生成します。\n`);

  let done = 0, skipped = 0, failed = 0;

  for (const file of inputFiles) {
    const baseName = path.parse(file).name;
    const inputPath = path.join(INPUT_DIR, file);
    const outDir = path.join(OUTPUT_DIR, baseName);
    fs.mkdirSync(outDir, { recursive: true });

    for (const [patternName, patternPrompt] of Object.entries(PATTERNS)) {
      const outPath = path.join(outDir, `${patternName}.png`);
      if (fs.existsSync(outPath)) {
        console.log(`[スキップ] ${baseName} / ${patternName}（既に生成済み）`);
        skipped++;
        continue;
      }

      const prompt = `${COMMON_PROMPT}\n\n${patternPrompt}`;
      process.stdout.write(`[生成中] ${baseName} / ${patternName} ... `);

      let attempt = 0;
      let ok = false;
      while (attempt < 2 && !ok) {
        attempt++;
        try {
          const imgBuf = await generateOne(apiKey, inputPath, prompt);
          fs.writeFileSync(outPath, imgBuf);
          console.log(`OK (${(imgBuf.length / 1024).toFixed(0)}KB)`);
          done++;
          ok = true;
        } catch (e) {
          if (attempt < 2) {
            console.log(`失敗、再試行します… (${e.message.slice(0, 120)})`);
            await sleep(3000);
          } else {
            console.log(`失敗: ${e.message.slice(0, 200)}`);
            failed++;
          }
        }
      }
      await sleep(1200); // レート制限対策の小休止
    }
  }

  console.log(`\n完了。 生成:${done} スキップ:${skipped} 失敗:${failed}`);
  if (failed > 0) {
    console.log("失敗した組み合わせは、もう一度 node generate.js を実行すれば再試行されます。");
  }
}

main().catch((e) => {
  console.error("致命的エラー:", e);
  process.exit(1);
});
