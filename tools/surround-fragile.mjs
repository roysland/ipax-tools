// Prototype: surround-fragility heuristic for IPAX pairs.
//
// Several IPAX terms are only valid when the pair's background dominates the
// adapting field (fullscreen viewing). On an ultrawide with a non-fullscreen
// window, the wallpaper/adjacent windows set the adaptation state instead.
// This script estimates how fragile a pair's score is under that condition:
//
//   1. term dependence — score-points riding on surround-dependent
//      penalties/rewards (glare, mydriasis, halation, sim_contrast;
//      chromatic_relief, paper_tone).
//   2. adaptation flip — re-score with forceContext inverted, approximating
//      "the surround, not the background, sets adaptation" via the engine's
//      own API. The delta measures dependence on the fullscreen assumption
//      (score *instability*, not predicted experience — flipped scores often
//      rise because the engine can't see the surround at all).
//
// Usage:
//   node tools/surround-fragile.mjs                 # built-in 16-pair suite
//   node tools/surround-fragile.mjs '#333' '#FFF'   # single text/bg pair
import { getIPAXscore } from '../packages/core/index.js';

const SURROUND_PENALTIES = new Set(['mydriasis', 'glare', 'halation', 'sim_contrast']);
const SURROUND_REWARDS = new Set(['chromatic_relief', 'paper_tone']);

const SUITE = [
  ['A', '#000000', '#FFFFFF'], ['A', '#1A1A1A', '#FFFFFF'], ['A', '#333333', '#FFFFFF'], ['A', '#4D4D4D', '#FFFFFF'],
  ['B', '#000000', '#F5F1E8'], ['B', '#333333', '#F2EFE9'], ['B', '#333333', '#EDE8DC'], ['B', '#3A3A3A', '#E8E2D4'],
  ['C', '#FFFFFF', '#000000'], ['C', '#E6E6E6', '#121212'], ['C', '#C9C9C9', '#1E1E1E'], ['C', '#B3B3B3', '#2B2B2B'],
  ['D', '#595959', '#FFFFFF'], ['D', '#6B6B6B', '#F2EFE9'], ['D', '#767676', '#FFFFFF'], ['D', '#8A8A8A', '#E8E2D4'],
];

export function surroundFragility(txt, bg) {
  const base = getIPAXscore(txt, bg);

  const penShare = base.details.penalties
    .filter(p => SURROUND_PENALTIES.has(p.slug)).reduce((s, p) => s + p.val, 0);
  const rewShare = base.details.rewards
    .filter(r => SURROUND_REWARDS.has(r.slug)).reduce((s, r) => s + r.val, 0);
  const termShare = penShare + rewShare;

  const flippedCtx = base.input.darkMode ? 'light' : 'dark';
  const flipped = getIPAXscore(txt, bg, flippedCtx);
  const contextDelta = Math.abs(base.score - flipped.score);

  const fragility = parseFloat((termShare + contextDelta).toFixed(2));
  const grade = fragility >= 1.0 ? 'high' : fragility >= 0.4 ? 'medium' : 'low';

  return { base, flipped, termShare: +termShare.toFixed(2), contextDelta: +contextDelta.toFixed(2), fragility, grade };
}

const args = process.argv.slice(2);
const pairs = args.length === 2 ? [['-', args[0], args[1]]] : SUITE;

console.log('pair                        ipax   termDep   ctxΔ  (flip→)  fragility');
for (const [g, txt, bg] of pairs) {
  const r = surroundFragility(txt, bg);
  console.log(
    `${g} ${txt} on ${bg}  ${r.base.string.padEnd(5)} ${String(r.termShare).padStart(6)}  ${String(r.contextDelta).padStart(5)}  (${String(r.flipped.score).padStart(4)})  ${String(r.fragility).padStart(6)}  ${r.grade}`
  );
}
