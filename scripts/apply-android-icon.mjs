import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const resourceDir = join("android", "app", "src", "main", "res", "drawable-nodpi");
const manifestPath = join("android", "app", "src", "main", "AndroidManifest.xml");
const iconResource = "@drawable/vegia_icon";

mkdirSync(resourceDir, { recursive: true });
copyFileSync(join("src", "assets", "motiva-logo.webp"), join(resourceDir, "vegia_icon.webp"));

const manifest = readFileSync(manifestPath, "utf8");
const replacements = [
  ['android:icon="@mipmap/ic_launcher"', `android:icon="${iconResource}"`],
  ['android:roundIcon="@mipmap/ic_launcher_round"', `android:roundIcon="${iconResource}"`],
];

let updated = manifest;
for (const [original, replacement] of replacements) {
  if (updated.includes(original)) updated = updated.replace(original, replacement);
  else if (!updated.includes(replacement)) throw new Error(`AndroidManifest.xml sem ${original}`);
}

writeFileSync(manifestPath, updated);
console.log("Ícone Android VegiaMap configurado.");
