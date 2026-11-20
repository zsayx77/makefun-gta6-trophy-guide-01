// Leonida Trophy Guide — the hand-in program (Node 22, standard library only).
//
// The guide itself is app/: plain static files, no build step, no network at run time.
// app/index.html is the tracker, app/app.js its logic, app/style.css its look, and
// app/data/trophies.json + app/data/roadmap.json its data. screenshots/ holds 3–4
// real browser renders of the guide. This program copies app/ and screenshots/
// from beside this file into the output directory and writes dossier.json there
// with the vendored make.fun library — the summary the judge reads (screenshots,
// first-load files and bytes, and the source). vendor/makefun-frontend.ts is the
// kit's copy, unchanged: the scorer rebuilds the dossier with the same library
// and requires the two to match byte for byte.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (inside the grader, MAKEFUN_OUTPUT_DIR is unset and /output is used instead.)

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });

cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (from the kit's gate): only text_max_bytes shapes the
// bytes; the rest refuse an entry the scorer would refuse — more than 4
// screenshots, one over 256 KiB, more than 993 files and directories in app/,
// or 48 MiB of app files in total.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Verify what was written instead of trusting the write: the dossier must
// parse, and it must carry exactly the screenshots this run copied. A
// mismatch means the hand-in is corrupt and the run must fail loudly.
const written = JSON.parse(readFileSync(join(outDir, 'dossier.json'), 'utf8'));
const shotCount = readdirSync(join(outDir, 'screenshots')).filter((f) => /\.(png|jpe?g)$/i.test(f)).length;
if (!Array.isArray(written.images) || written.images.length !== shotCount) {
  throw new Error(`dossier check failed: ${written.images?.length ?? 0} images in dossier, ${shotCount} screenshots on disk`);
}
console.log(`Leonida Trophy Guide handed in to ${outDir} (${dossier.length} bytes of dossier, ${shotCount} screenshots).`);
