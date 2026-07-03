/**
 * Layout architecture verification — document flow mode.
 * Checks that the page scrolls naturally through all dashboard sections,
 * and that only the Candidate Explorer manages internal scrolling.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = 'http://localhost:5175';

async function run() {
  const browser = await chromium.launch({ headless: true });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  LAYOUT ARCHITECTURE VERIFICATION');
  console.log('══════════════════════════════════════════════════════════\n');

  // ── Test 1: Document-flow page scrolling ─────────────────────
  console.log('▸ Test 1: Document-flow & section visibility');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1200);

    const result = await page.evaluate(() => {
      const html = document.documentElement;
      // Page should be taller than viewport (sections overflow)
      const pageTaller = html.scrollHeight > window.innerHeight;
      const noHScroll  = html.scrollWidth <= window.innerWidth + 2;

      // Header should be sticky
      const header = document.querySelector('header, [class*="header_"]');
      const headerStyle = header ? window.getComputedStyle(header) : null;
      const headerSticky = headerStyle?.position === 'sticky';

      // Shell should NOT have overflow:hidden or fixed height
      const shell = document.querySelector('[class*="shell_"]');
      const shellStyle = shell ? window.getComputedStyle(shell) : null;
      const shellOverflow = shellStyle?.overflow ?? 'ok';
      const shellHeight   = shellStyle?.height ?? 'auto';
      const shellBad = shellOverflow === 'hidden' || shellHeight.endsWith('px') && Number(shellHeight) < 1000;

      // Explorer should have a fixed height (bounded scroll island)
      const explorer = document.querySelector('[class*="explorer_"]');
      const explorerStyle = explorer ? window.getComputedStyle(explorer) : null;
      const explorerH = explorerStyle ? Math.round(Number(explorerStyle.height.replace('px', ''))) : 0;
      const explorerBounded = explorerH > 400 && explorerH < 1000;

      // All dashboard sections should exist in DOM
      const sections = {
        brief:    !!document.querySelector('[class*="wrapper_"]'),
        kpi:      !!document.querySelector('[class*="center_"]'),
        map:      !!document.querySelector('[class*="container_"]'),
        priority: !!document.querySelector('[class*="section_"]'),
        explorer: !!explorer,
      };

      return {
        pageTaller, noHScroll, headerSticky, shellBad, shellOverflow, shellHeight,
        explorerH, explorerBounded, sections,
        scrollH: html.scrollHeight, viewH: window.innerHeight,
      };
    });

    const pass1 = result.pageTaller && result.noHScroll && !result.shellBad && result.explorerBounded;
    console.log(`  ${pass1 ? '✅' : '❌'} Page scrollable: scrollH=${result.scrollH} viewH=${result.viewH} (taller=${result.pageTaller})`);
    console.log(`  ${result.noHScroll ? '✅' : '❌'} No horizontal overflow`);
    console.log(`  ${result.headerSticky ? '✅' : '⚠️'} Header sticky: ${result.headerSticky}`);
    console.log(`  ${!result.shellBad ? '✅' : '❌'} Shell unconstrained (overflow=${result.shellOverflow})`);
    console.log(`  ${result.explorerBounded ? '✅' : '❌'} Explorer bounded height: ${result.explorerH}px`);
    console.log(`  Sections: ${Object.entries(result.sections).map(([k,v])=>`${k}=${v?'✓':'✗'}`).join(' ')}`);

    await page.screenshot({ path: 'arch_1440_top.png' });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'arch_1440_bottom.png' });
    await ctx.close();
  }

  // ── Test 2: Explorer internal scroll works ──────────────────
  console.log('\n▸ Test 2: Explorer internal scroll (candidate table)');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1200);

    // Scroll down to the explorer
    await page.evaluate(() => {
      const el = document.querySelector('[class*="explorer_"]');
      el?.scrollIntoView();
    });
    await page.waitForTimeout(300);

    // Scroll inside the tbody (table scroll)
    const tbodyScrollable = await page.evaluate(() => {
      const tbody = document.querySelector('[class*="tbody_"]');
      if (!tbody) return { found: false };
      return {
        found: true,
        scrollH: tbody.scrollHeight,
        clientH: tbody.clientHeight,
        canScroll: tbody.scrollHeight > tbody.clientHeight,
      };
    });

    console.log(`  ${tbodyScrollable.found && tbodyScrollable.canScroll ? '✅' : '❌'} tbody scroll: scrollH=${tbodyScrollable.scrollH} clientH=${tbodyScrollable.clientH}`);

    await ctx.close();
  }

  // ── Test 3: Panel opens alongside table (not full-page) ──────
  console.log('\n▸ Test 3: Detail panel opens alongside table');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1200);

    // Scroll to explorer
    await page.evaluate(() => document.querySelector('[class*="explorer_"]')?.scrollIntoView());
    await page.waitForTimeout(300);

    // Click a candidate row to open panel
    const viewBtn = page.locator('[class*="viewBtn"]').first();
    if (await viewBtn.isVisible().catch(() => false)) {
      await viewBtn.click();
      await page.waitForTimeout(500);
    }

    const panelResult = await page.evaluate(() => {
      const panel = document.querySelector('[class*="detailPanelContainer_"]');
      if (!panel) return { found: false };
      const rect = panel.getBoundingClientRect();
      const explorer = document.querySelector('[class*="explorer_"]');
      const expRect = explorer?.getBoundingClientRect();
      return {
        found: true,
        panelW: Math.round(rect.width),
        panelH: Math.round(rect.height),
        // Panel top should match explorer top
        sameTopAsExplorer: expRect ? Math.abs(rect.top - expRect.top) < 5 : false,
        // Panel should not fill the whole viewport
        isFullPage: rect.height > window.innerHeight * 0.95,
      };
    });

    const panelOk = panelResult.found && !panelResult.isFullPage && panelResult.sameTopAsExplorer;
    console.log(`  ${panelOk ? '✅' : '❌'} Panel alongside table: ${panelResult.panelW}×${panelResult.panelH}px, sameTop=${panelResult.sameTopAsExplorer}`);

    await page.screenshot({ path: 'arch_panel_open.png' });
    await ctx.close();
  }

  // ── Test 4: Viewport height changes — page grows, not compresses
  console.log('\n▸ Test 4: Small viewport — page grows, not compresses');
  const HEIGHTS = [
    { w: 1440, h: 600,  zoom: '100%',   label: '1440×600' },
    { w: 1440, h: 768,  zoom: '125%',   label: '1440×768 (≈125% zoom)' },
    { w: 1440, h: 617,  zoom: '175%',   label: '1440×617 (≈175% zoom)' },
  ];

  for (const vp of HEIGHTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(800);

    const result = await page.evaluate(() => {
      const html = document.documentElement;
      return {
        scrollH: html.scrollHeight,
        viewH: window.innerHeight,
        scrollW: html.scrollWidth,
        viewW: window.innerWidth,
      };
    });

    const pageTaller = result.scrollH > result.viewH;
    const noHScroll  = result.scrollW <= result.viewW + 2;
    console.log(`  ${pageTaller && noHScroll ? '✅' : '❌'} ${vp.label} (${vp.zoom}): scrollH=${result.scrollH} viewH=${result.viewH} ${pageTaller ? 'taller ✓' : 'fits in viewport!'}`);

    await ctx.close();
  }

  await browser.close();

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  Screenshots: arch_1440_top.png, arch_1440_bottom.png,');
  console.log('               arch_panel_open.png');
  console.log('══════════════════════════════════════════════════════════\n');
}

run().catch(e => { console.error(e.message); process.exit(1); });
