import { chromium } from 'playwright';

const URL = 'http://localhost:5175';

const VIEWPORTS = [
  { w: 2560, h: 1440, label: '2560px (4K)' },
  { w: 1920, h: 1080, label: '1920px (FHD)' },
  { w: 1440, h: 900,  label: '1440px (laptop)' },
  { w: 1280, h: 800,  label: '1280px' },
  { w: 1152, h: 768,  label: '1152px' },
  { w: 1024, h: 768,  label: '1024px' },
  { w: 768,  h: 1024, label: '768px (tablet)' },
];

async function checkViewport(page, viewport) {
  await page.setViewportSize({ width: viewport.w, height: viewport.h });
  await page.waitForTimeout(300);

  const result = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const bodyW = body.getBoundingClientRect().width;
    const scrollW = html.scrollWidth;
    const viewW = window.innerWidth;

    // Check for horizontal overflow
    const hasHScroll = scrollW > viewW + 1; // 1px tolerance

    // Find all elements wider than viewport
    const overflowing = [];
    for (const el of document.querySelectorAll('*')) {
      const rect = el.getBoundingClientRect();
      if (rect.right > viewW + 2) {
        const cls = (el.className || '').toString().substring(0, 60);
        overflowing.push(`${el.tagName}.${cls} (right=${Math.round(rect.right)})`);
        if (overflowing.length >= 5) break;
      }
    }

    // Check key elements exist
    const hasBrief = !!document.querySelector('[aria-label="AI Hiring Brief"]');
    const hasCommandCenter = !!document.querySelector('[class*="center_"]');
    const hasMap = !!document.querySelector('[class*="container_"]');

    // Check panel width (if open)
    const panel = document.querySelector('[class*="panelContainer_"]');
    const panelW = panel ? Math.round(panel.getBoundingClientRect().width) : 0;

    // Check for unsupported overlay
    const isUnsupported = !!document.querySelector('[class*="unsupported"]');

    return {
      hasHScroll,
      scrollW,
      viewW,
      overflowing: overflowing.slice(0, 3),
      hasBrief,
      hasCommandCenter,
      hasMap,
      panelW,
      isUnsupported,
    };
  });

  return result;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);

  // Open detail panel to test panel responsiveness
  const viewBtn = page.locator('[class*="viewBtn"]').first();
  if (await viewBtn.isVisible().catch(() => false)) {
    await viewBtn.click();
    await page.waitForTimeout(500);
  }

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  RESPONSIVE LAYOUT VERIFICATION');
  console.log('══════════════════════════════════════════════════════');

  const allPass = [];

  for (const vp of VIEWPORTS) {
    const result = await checkViewport(page, vp);
    const pass = !result.hasHScroll && !result.isUnsupported;
    const mark = pass ? '✅' : result.isUnsupported ? '⚠️' : '❌';

    console.log(`\n${mark} ${vp.label}`);
    if (result.isUnsupported) {
      console.log('   → Shows "unsupported" message (expected below 768px)');
    } else {
      console.log(`   scroll: ${result.scrollW}px  viewport: ${result.viewW}px  ${result.hasHScroll ? '⚠ OVERFLOW!' : 'no overflow'}`);
      console.log(`   panel: ${result.panelW}px  brief: ${result.hasBrief}  kpi: ${result.hasCommandCenter}`);
      if (result.overflowing.length > 0) {
        console.log(`   overflowing: ${result.overflowing.join(', ')}`);
      }
    }

    // Take screenshot
    const filename = `resp_${vp.w}.png`;
    await page.screenshot({ path: filename, fullPage: false });

    allPass.push({ vp: vp.label, pass: pass || result.isUnsupported });
  }

  await browser.close();

  console.log('\n══════════════════════════════════════════════════════');
  const failed = allPass.filter(r => !r.pass);
  if (failed.length === 0) {
    console.log(`  ALL ${allPass.length} VIEWPORTS PASS — no horizontal overflow`);
  } else {
    console.log(`  ${failed.length} VIEWPORT(S) FAILED:`);
    failed.forEach(r => console.log(`    ❌ ${r.vp}`));
  }
  console.log('══════════════════════════════════════════════════════\n');

  if (failed.length > 0) process.exit(1);
}

run().catch(e => { console.error(e.message); process.exit(1); });
