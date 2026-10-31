// Layout check at iPhone sizes in WebKit (Safari's engine), light + dark.
// Builds nothing: run `npm run build` first. Usage: npm run layout
// - fails if any page scrolls horizontally
// - reports buttons smaller than 44px (Apple's minimum tap target)
// - drives one full drill → feedback → "Explain more" with OpenAI mocked
// Screenshots go to layout-shots/ (git-ignored).
import { webkit, devices } from 'playwright';
import { preview } from 'vite';
import { mkdirSync } from 'node:fs';

const SIZES = [
  { name: 'se', viewport: { width: 375, height: 667 } },
  { name: '15', viewport: { width: 390, height: 844 } },
  { name: 'promax', viewport: { width: 430, height: 932 } },
];
const PAGES = [
  ['home', '#/'],
  ['lessons', '#/lessons'],
  ['lesson1', '#/lesson/1'],
  ['lesson2', '#/lesson/2'],
  ['positions', '#/practice/positions'],
  ['preflop', '#/practice/preflop'],
  ['stats', '#/stats'],
  ['settings', '#/settings'],
];
// Small by design: chart cells (read-only grid; tap shows the hand), inline glossary words.
const SMALL_OK = '.grid13 button, .gl, input.switch'; // switch: its whole row is the tap target (label)

mkdirSync('layout-shots', { recursive: true });
const server = await preview({ preview: { port: 4317, strictPort: true }, logLevel: 'silent' });
const base = 'http://localhost:4317/';
const browser = await webkit.launch();
let failures = 0;
const smallReport = new Map();

for (const scheme of ['light', 'dark']) {
  for (const size of SIZES) {
    // Service workers blocked so Playwright can mock api.openai.com (offline behaviour is checked separately).
    const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: size.viewport, colorScheme: scheme, serviceWorkers: 'block' });
    await ctx.addInitScript(() => localStorage.setItem('holdem-coach:openai-key', 'sk-test-layout-check-0000'));
    await ctx.route('https://api.openai.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Position matters because you act last.\nNote: test disagreement line.' }] }] }) }));
    const page = await ctx.newPage();
    for (const [name, hash] of PAGES) {
      await page.goto(base + hash);
      await page.waitForTimeout(250);
      const m = await page.evaluate((SMALL_OK) => {
        const sw = document.documentElement.scrollWidth, iw = window.innerWidth;
        const small = [...document.querySelectorAll('button, input, a, [role=button]')]
          .filter((el) => !el.matches(SMALL_OK) && el.offsetParent !== null)
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.height < 44 || r.width < 44)
          .map(({ el, r }) => `${el.tagName.toLowerCase()}.${el.className || ''} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
        return { sw, iw, small };
      }, SMALL_OK);
      if (m.sw > m.iw) { failures++; console.log(`✗ ${scheme}/${size.name}/${name}: horizontal overflow ${m.sw} > ${m.iw}`); }
      for (const s of m.small) smallReport.set(`${name}: ${s.replace(/\d+x\d+$/, '')}`, s);
      await page.screenshot({ path: `layout-shots/${scheme}-${size.name}-${name}.png`, fullPage: true });
    }

    // End-to-end drill: answer → feedback → Explain more (mocked) → follow-up box.
    await page.goto(base + '#/practice/preflop');
    await page.locator('.choice').first().click();
    await page.locator('.feedback').waitFor();
    await page.waitForTimeout(400); // let the fade-in finish
    await page.screenshot({ path: `layout-shots/${scheme}-${size.name}-feedback.png`, fullPage: true });
    await page.getByRole('button', { name: /Explain more/ }).click();
    await page.locator('.chat-note').waitFor({ timeout: 5000 });
    await page.waitForTimeout(400);
    const sheetOk = await page.locator('input[aria-label="Follow-up question"]').isVisible();
    if (!sheetOk) { failures++; console.log(`✗ ${scheme}/${size.name}: follow-up input missing`); }
    const ow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (ow) { failures++; console.log(`✗ ${scheme}/${size.name}/explain: overflow`); }
    await page.screenshot({ path: `layout-shots/${scheme}-${size.name}-explain.png` });

    // Lesson 2, screen 2: the 13x13 chart.
    await page.goto(base + '#/lesson/2');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.locator('.grid13').waitFor();
    await page.locator('.grid13 button', { hasText: 'A5s' }).click();
    await page.waitForTimeout(300);
    const gw = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (gw) { failures++; console.log(`✗ ${scheme}/${size.name}/chart: overflow`); }
    await page.screenshot({ path: `layout-shots/${scheme}-${size.name}-chart.png`, fullPage: true });

    // Glossary sheet from a lesson link.
    await page.goto(base + '#/lesson/1');
    await page.locator('.gl').first().click();
    await page.locator('.sheet').waitFor();
    await page.screenshot({ path: `layout-shots/${scheme}-${size.name}-glossary.png` });
    await ctx.close();
  }
}
await browser.close();
await new Promise((r) => server.httpServer.close(r));
console.log(`\nUndersized tap targets (<44px), excluding chart cells, inline glossary words and row-wrapped switches:`);
console.log(smallReport.size ? [...smallReport.values()].map((s) => '  ' + s).join('\n') : '  none');
console.log(failures ? `\n${failures} layout failure(s)` : '\n✓ No horizontal overflow at 375/390/430px in light and dark; drill → feedback → Explain more works');
process.exit(failures ? 1 : 0);
