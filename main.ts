// Rush Kitchen — the hand-in program (Node 22, standard library only).
//
// What it does: copies this repo's game/ and screenshots/ into the grader's
// output directory and writes /output/dossier.json with the vendored make.fun
// library (vendor/makefun-game.ts, the kit's copy, unchanged). It never
// deletes anything: the output directory is created if missing and files are
// copied over it, so a re-run is safe.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Create (never delete) the output directory, then hand the game in.
mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps, from the kit's reference gate: only text_max_bytes
// shapes the dossier bytes; the others refuse an entry the scorer would
// refuse anyway (more than 4 screenshots or one over 256 KiB; more than 993
// files in game/ or 48 MiB of game files in all).
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Rush Kitchen handed in: ${outDir}`);
