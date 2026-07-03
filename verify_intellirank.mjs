import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

try {
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'verify_initial.png' });
  console.log('✓ Initial screenshot saved: verify_initial.png');

  // Core presence checks
  const presenceChecks = [
    ['AI Command Center', '[aria-label="AI Command Center"]'],
    ['Score Landscape (map title)', '[class*="mapTitle"]'],
    ['Priority Candidates section', '[aria-label="Priority candidates for review"]'],
    ['AI pulsing dot', '[class*="aiDot"]'],
    ['Search hint ⌘K', '[class*="searchHint"]'],
    ['AI Narrative strip', '[class*="narrative"]'],
  ];

  for (const [name, sel] of presenceChecks) {
    const el = await page.$(sel);
    console.log((el ? '✓' : '✗') + ' ' + name + ': ' + (el ? 'PRESENT' : 'MISSING'));
  }

  // Count skill chips
  const skillChips = await page.$$('[class*="skillChip"]');
  console.log(`✓ Skill chips in candidate rows: ${skillChips.length}`);

  // Check priority candidate cards
  const priorityViewBtns = await page.$$('[class*="viewBtn"]');
  console.log(`✓ Priority candidate View Profile buttons: ${priorityViewBtns.length}`);

  // Get narrative text
  const narrativeEl = await page.$('[class*="narrativeText"]');
  if (narrativeEl) {
    const text = await narrativeEl.innerText();
    console.log(`✓ Narrative: "${text.trim().substring(0, 80)}..."`);
  }

  // Click first candidate row
  const firstRow = await page.$('[data-testid^="candidate-row"]');
  if (firstRow) {
    await firstRow.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'verify_detail.png' });
    console.log('✓ Detail panel screenshot saved: verify_detail.png');

    const verdict = await page.$('[class*="verdictLabel"]');
    console.log((verdict ? '✓' : '✗') + ' Verdict label: ' + (verdict ? await verdict.innerText() : 'MISSING'));

    const scoreNum = await page.$('[class*="verdictScoreNum"]');
    console.log((scoreNum ? '✓' : '✗') + ' Score number: ' + (scoreNum ? await scoreNum.innerText() : 'MISSING'));

    const gauge = await page.$('[class*="gauge"]');
    console.log((gauge ? '✓' : '✗') + ' Confidence gauge: ' + (gauge ? 'PRESENT' : 'MISSING'));

    const sectionTitles = await page.$$('[class*="sectionTitle"]');
    const titles = [];
    for (const t of sectionTitles.slice(0,5)) titles.push(await t.innerText());
    console.log('✓ Detail sections: ' + titles.join(' | '));
  }

  // Check header pipeline stat
  const pipelineStat = await page.$('[class*="pipelineStat"]');
  if (pipelineStat) {
    const txt = await pipelineStat.innerText();
    console.log('✓ Header pipeline stat: ' + txt.replace(/\n/g, ' '));
  }

  // Full screenshot of page with detail panel open
  await page.screenshot({ path: 'verify_with_detail.png' });
  console.log('✓ Full screenshot with detail panel saved: verify_with_detail.png');

} finally {
  await browser.close();
}
