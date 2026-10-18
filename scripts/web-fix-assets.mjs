// Expo web dışa aktarımı ikon yazı tiplerini `assets/node_modules/...` altına koyar; Cloudflare Pages
// (wrangler) `node_modules` klasörlerini yüklemez, o adresler HTML'e düşer ve ikonlar görünmez.
// Bu betik klasörü `assets/vendor` olarak yeniden adlandırır ve tüm başvuruları günceller.
// Kullanım: node scripts/web-fix-assets.mjs <dışa-aktarım-klasörü>
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = process.argv[2];
if (!dist) throw new Error("Kullanım: node scripts/web-fix-assets.mjs <klasör>");

const from = join(dist, "assets", "node_modules");
const to = join(dist, "assets", "vendor");
if (!existsSync(from)) {
  console.log("assets/node_modules yok, yapılacak bir şey kalmadı.");
  process.exit(0);
}

cpSync(from, to, { recursive: true });
rmSync(from, { recursive: true, force: true });

let files = 0;
let refs = 0;
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|css|html|json|map)$/.test(name)) {
      const text = readFileSync(p, "utf8");
      const next = text.replaceAll("assets/node_modules/", "assets/vendor/");
      if (next !== text) {
        refs += text.split("assets/node_modules/").length - 1;
        writeFileSync(p, next);
        files++;
      }
    }
  }
};
walk(dist);
console.log(`assets/node_modules → assets/vendor: ${refs} başvuru, ${files} dosya güncellendi.`);
