/*
 * Standalone verification of the theme-builder's pure logic (no test runner
 * needed). Run from the repo root:
 *
 *   node_modules/.bin/esbuild apps/theme-builder/scripts/verify.ts \
 *     --bundle --platform=node --format=esm --outfile=/tmp/tb-verify.mjs \
 *     && node /tmp/tb-verify.mjs
 */
import { createDefaultTheme, normalizeModel } from '../src/lib/defaultTheme';
import { generateCss, sanitizeName } from '../src/lib/generateCss';
import { parseCss } from '../src/lib/parseCss';
import { PRESETS } from '../src/lib/presets';
import { LAYOUT_KEYS } from '../src/types/theme';
import { formatColor, parseColor } from '../src/lib/color';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  } else {
    console.log('  ✓ ' + msg);
  }
};

console.log('1. generateCss basics');
{
  const m = createDefaultTheme('cool-theme');
  const css = generateCss(m);
  ok(css.includes('.slide.cool-theme {'), 'scopes to .slide.<name>');
  ok(css.includes('--demotime-color'), 'emits --demotime-* variables');
  ok(!css.includes('undefined'), 'contains no "undefined" tokens');
  ok(!css.includes('NaN'), 'contains no "NaN" tokens');
  ok(!/@apply/.test(css), 'no @apply (plain, portable CSS)');
  for (const key of LAYOUT_KEYS) {
    ok(css.includes(`.slide.cool-theme .${key}`), `has rules for layout "${key}"`);
  }
  ok(css.includes('.slide__content__inner'), 'styles content inner (per layout)');
  ok(css.includes('@demotime-theme-builder:1'), 'embeds re-import snapshot');
}

console.log('2. lossless round-trip (default + every preset)');
{
  const models = [createDefaultTheme('round-trip'), ...PRESETS.map((p) => p.create())];
  for (const original of models) {
    const css = generateCss(original);
    const { model, lossless } = parseCss(css);
    ok(lossless, `${original.displayName}: detected as lossless`);
    ok(
      JSON.stringify(model) === JSON.stringify(original),
      `${original.displayName}: model survives export → import unchanged`
    );
  }
}

console.log('3. presets produce sensible CSS');
{
  for (const p of PRESETS) {
    const css = generateCss(p.create());
    ok(css.length > 500 && !css.includes('undefined'), `${p.label}: generates clean CSS`);
  }
  // Pixels uses a mono font; quantum uses a gradient background.
  ok(generateCss(PRESETS.find((p) => p.id === 'pixels')!.create()).includes('monospace'), 'pixels uses a mono font');
  ok(
    generateCss(PRESETS.find((p) => p.id === 'quantum')!.create()).includes('linear-gradient'),
    'quantum keeps its gradient background'
  );
}

console.log('4. best-effort import of external CSS (espc25 style)');
{
  const espc25 = `.slide.espc25 {
  background: #081f37;
  color: #fff;
  font-size: 24px;
  font-family: "Arial", sans-serif;
  .slide__layout { background-image: url(".demo/assets/background.webp"); }
  h1 { color: #00c700; font-size: 32px; }
}`;
  const { model, lossless, warnings } = parseCss(espc25);
  ok(!lossless, 'flagged as best-effort');
  ok(warnings.length > 0, 'returns a warning');
  ok(model.name === 'espc25', `theme name extracted ("${model.name}")`);
  ok(model.colors.background === '#081f37', `background extracted ("${model.colors.background}")`);
  ok(model.colors.text === '#fff', `text colour extracted ("${model.colors.text}")`);
  ok(model.typography.baseFontSize === 24, `font-size extracted (${model.typography.baseFontSize})`);
  ok(/Arial/.test(model.typography.fontFamily), 'font-family extracted');
  ok(model.backgroundImage?.url === '.demo/assets/background.webp', 'background image url extracted');
  ok(model.colors.heading === '#00c700', `h1 colour extracted ("${model.colors.heading}")`);
}

console.log('5. import of a built-in style (variables w/ indirection)');
{
  const quantumLike = `.slide.quantum {
  --demotime-primary: #3a86ff;
  --demotime-accent: #ff006e;
  --demotime-light: #f8f9fa;
  --demotime-color: var(--demotime-light);
  --demotime-link-color: var(--demotime-primary);
  --demotime-link-active-color: var(--demotime-accent);
}`;
  const { model } = parseCss(quantumLike);
  ok(model.colors.text === '#f8f9fa', `resolves var indirection for text ("${model.colors.text}")`);
  ok(model.colors.link === '#3a86ff', `resolves var indirection for link ("${model.colors.link}")`);
  ok(model.colors.linkHover === '#ff006e', `resolves var indirection for link hover ("${model.colors.linkHover}")`);
}

console.log('6. sanitizeName');
{
  ok(sanitizeName('My Cool Theme!') === 'my-cool-theme', 'spaces/punctuation → kebab');
  ok(sanitizeName('123abc') === '_123abc', 'leading digit prefixed');
  ok(sanitizeName('') === 'my-theme', 'empty → fallback');
}

console.log('7. data-URL background image survives best-effort import (review fix #2)');
{
  const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const css = `.slide.foo .slide__layout { background-image: url("${dataUrl}"); background-size: contain; }`;
  const { model } = parseCss(css);
  ok(model.backgroundImage?.url === dataUrl, 'full data URL (with ";") preserved');
  ok(model.backgroundImage?.size === 'contain', 'background-size preserved alongside it');
}

console.log('8. per-layout heading background gets badge padding (review fix #1)');
{
  const m = createDefaultTheme('badge');
  m.layouts.image.headingBackground = 'rgba(255,255,255,0.85)';
  const css = generateCss(m);
  const block = css.slice(css.indexOf('.slide.badge .image h1'));
  ok(/display: inline-block/.test(block.slice(0, 200)), 'per-layout badge → display:inline-block');
  ok(/padding: 0\.1em/.test(block.slice(0, 200)), 'per-layout badge → padding');
}
{
  // global badge + per-layout transparent override clears the badge
  const m = createDefaultTheme('badge2');
  m.colors.headingBackground = '#fff';
  m.layouts.intro.headingBackground = 'transparent';
  const css = generateCss(m);
  const block = css.slice(css.indexOf('.slide.badge2 .intro h1'));
  ok(/display: block/.test(block.slice(0, 200)), 'transparent override under global badge clears display');
}

console.log('9. video layout emits full-bleed .slide__video positioning (review fix #6)');
{
  const css = generateCss(createDefaultTheme('vid'));
  ok(css.includes('.slide.vid .video .slide__video'), 'emits .slide__video rule');
  const block = css.slice(css.indexOf('.slide.vid .video .slide__video {'));
  ok(/position: fixed/.test(block.slice(0, 200)), '.slide__video is position:fixed');
  ok(css.includes('.slide.vid .video .slide__video video'), 'emits inner <video> cover rule');
}

console.log('10. two-columns has base flex + grid override (review fix #8)');
{
  const css = generateCss(createDefaultTheme('cols'));
  ok(css.includes('.slide.cols .two-columns .slide__content__inner {'), 'base inner rule present');
  const base = css.slice(css.indexOf('.slide.cols .two-columns .slide__content__inner {'));
  ok(/display: flex/.test(base.slice(0, 200)), 'base inner is flex (wrapper-less stacking)');
  ok(css.includes(':has(> .slide__left)'), 'grid override for wrapped columns present');
}

console.log('11. comment with .slide.<x> does not mislead theme name (review fix #9)');
{
  const css = `/* example usage: .slide.notTheName { ... } */\n.slide.realname { background: #112233; color: #eee; }`;
  const { model } = parseCss(css);
  ok(model.name === 'realname', `picked the real theme name ("${model.name}")`);
  ok(model.colors.background === '#112233', 'and still read its background');
}

console.log('12. normalizeModel backfills partial snapshots (review fix #3)');
{
  const partial = normalizeModel({ version: 1, name: 'partial', layouts: { default: {} } });
  ok(!!partial, 'returns a model for a partial snapshot');
  ok(!!partial && !!partial.colors && !!partial.typography && !!partial.light, 'backfills colors/typography/light');
  ok(LAYOUT_KEYS.every((k) => !!partial!.layouts[k]), 'backfills every layout');
  // and the backfilled model must generate CSS without throwing
  let threw = false;
  try {
    generateCss(partial!);
  } catch {
    threw = true;
  }
  ok(!threw, 'generateCss(normalized partial) does not throw');
  ok(normalizeModel(null) === null && normalizeModel(42) === null, 'rejects non-object input');
}

console.log('13. color opacity parse/format');
{
  ok(JSON.stringify(parseColor('#ff0000')) === JSON.stringify({ r: 255, g: 0, b: 0, a: 1 }), 'parses #rrggbb');
  ok(JSON.stringify(parseColor('#f00')) === JSON.stringify({ r: 255, g: 0, b: 0, a: 1 }), 'parses #rgb');
  const hex8 = parseColor('#ff000080');
  ok(!!hex8 && hex8.r === 255 && Math.abs(hex8.a - 0.5) < 0.01, 'parses #rrggbbaa alpha');
  const rgba = parseColor('rgba(10, 20, 30, 0.4)');
  ok(!!rgba && rgba.r === 10 && rgba.b === 30 && Math.abs(rgba.a - 0.4) < 0.001, 'parses rgba()');
  ok(parseColor('transparent') === null, 'transparent → null (free-text only)');
  ok(parseColor('linear-gradient(#000,#fff)') === null, 'gradient → null');
  ok(parseColor('var(--x)') === null, 'var() → null');
  ok(formatColor({ r: 255, g: 0, b: 0, a: 1 }) === '#ff0000', 'opaque → hex');
  ok(formatColor({ r: 255, g: 0, b: 0, a: 0.5 }) === 'rgba(255, 0, 0, 0.5)', 'translucent → rgba');
  // round-trips through the editor's pick→alpha flow
  const v = formatColor({ ...parseColor('#3366cc')!, a: 0.25 });
  ok(v === 'rgba(51, 102, 204, 0.25)', `pick + opacity composes ("${v}")`);
}

console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
