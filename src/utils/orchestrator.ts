import { WebCrawler } from '../crawler/crawler';
import { runAccessibilityAudit } from '../auditors/accessibility';
import { runSeoAudit } from '../auditors/seo';
import { generateHistoricReportsHub } from '../reporter/reporter';
import { DetailedReportData, PageAuditResult, DeviceFormFactor } from '../types/audit';
import * as path from 'path';

export async function executeSiteAudit(
  targetSite: string, 
  scanA11y: boolean, 
  scanSeo: boolean, 
  headless: boolean,
  deviceMode: DeviceFormFactor,
  pageCapValue: number
): Promise<void> {
  const runId = Math.random().toString(36).substring(2, 7).toUpperCase();
  const hostName = new URL(targetSite).hostname.replace(/[^a-z0-9]/gi, '_');

  console.log('\n========================================================================');
  console.log(`🚀 AUTOMATED RELEASE AUDIT PIPELINE INITIALIZED [RUN ID: ${runId}]`);
  console.log(`🎯 Target Platform  : ${targetSite}`);
  console.log(`📱 Device Emulation : ${deviceMode.toUpperCase()}`);
  console.log(`⚙️  Inspection Tiers : P1 (Functional Stability) | A11y: ${scanA11y ? 'ON' : 'OFF'} | SEO: ${scanSeo ? 'ON' : 'OFF'}`);
  console.log('========================================================================\n');

  const crawler = new WebCrawler(targetSite);
  const structuredPagesList: PageAuditResult[] = [];
  let aggregateA11yIssues = 0;
  let wasInterrupted = false;

  const handleInterrupt = (): void => {
    if (!wasInterrupted) {
      console.log('\n\n⚠️  [USER TERMINATION] Compiling structural metrics data...');
      wasInterrupted = true;
      crawler.stopGracefully();
    }
  };
  process.on('SIGINT', handleInterrupt);

  let executionSummary: any[] = [];
  try {
    executionSummary = await crawler.startCrawl(headless, runId, deviceMode, pageCapValue, async (page, url, statusCode, currentProgress, calculatedTotal) => {
      let a11yErrorsOnPage = 0;
      let seoScoreOnPage = 100;
      let pageA11yDetails: any[] = [];
      let pageSeoDetails: string[] = [];
      let pageSeoPassDetails: string[] = [];
      let screenshotPath: string | undefined = undefined;

      if (statusCode < 400) {
        const tasks: Promise<any>[] = [];
        if (scanA11y) tasks.push(runAccessibilityAudit(page, url));
        if (scanSeo) tasks.push(runSeoAudit(page, url, deviceMode));

        const auditResults = await Promise.all(tasks);

        let resultIndex = 0;
        if (scanA11y) {
          const a11yData = auditResults[resultIndex++];
          a11yErrorsOnPage = a11yData.violationCount;
          pageA11yDetails = a11yData.violations || [];
          aggregateA11yIssues += a11yErrorsOnPage;

          if (a11yErrorsOnPage > 0) {
            for (const error of pageA11yDetails) {
              const sel = error.targetSelector;
              const ruleId = error.id;
              
              if (sel && sel !== 'html' && sel !== 'body' && sel !== 'main') {
                try {
                  const elementLocator = page.locator(sel).first();
                  if (await elementLocator.count() > 0) {
                    // 🔥 UPGRADED RUNTIME INJECTION ENGINE: Maps coordinates directly to global document body layer
                    await elementLocator.evaluate((el, rule) => {
                      const htmlEl = el as HTMLElement;
                      
                      // Inject bright red tracking outline onto the element box structure
                      htmlEl.style.outline = '3px dashed #dc2626';
                      htmlEl.style.outlineOffset = '2px';

                      // Fetch exact viewport boundary metrics coordinates
                      const rect = htmlEl.getBoundingClientRect();
                      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                      
                      // Construct floating global overlay badge tag container
                      const badge = document.createElement('div');
                      badge.innerText = `⚠️ AXE BUG: ${rule}`;
                      
                      // HIGH-CONTRAST ENGINEERING DASHBOARD STYLING
                      badge.style.position = 'absolute';
                      // Position badge slightly higher than the top boundary coordinate safely
                      badge.style.top = `${rect.top + scrollTop - 24}px`;
                      badge.style.left = `${rect.left + scrollLeft}px`;
                      badge.style.backgroundColor = '#dc2626';
                      badge.style.color = '#ffff00'; // High-contrast warning yellow text colors
                      badge.style.fontFamily = "'SFMono-Regular', Consolas, 'Liberation Mono', monospace";
                      badge.style.fontSize = '11px';
                      badge.style.fontWeight = 'bold';
                      badge.style.padding = '3px 8px';
                      badge.style.borderRadius = '4px';
                      badge.style.boxShadow = '0 4px 12px rgba(0,0,0,0.35)';
                      badge.style.border = '1px solid #ffff00';
                      badge.style.zIndex = '2147483647'; // Maximum depth index to prevent elements from layering on top
                      badge.style.pointerEvents = 'none';
                      badge.style.whiteSpace = 'nowrap';
                      
                      // Append directly to global body layout to avoid parent overflow clipping bounds
                      document.body.appendChild(badge);
                    }, ruleId);
                  }
                } catch (_) {
                  // Catch detached links elements safely
                }
              }
            }

            // Capture the single full-page layout visual master blueprint
            const fileSafeName = url.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 40);
            const imgFilename = `screenshots/map_${runId}_${fileSafeName}.png`;
            const fullImgPath = path.join(process.cwd(), 'reports', hostName, imgFilename);
            
            await page.screenshot({ path: fullImgPath, fullPage: true });
            screenshotPath = imgFilename;
          }
        } else {
          pageA11yDetails = undefined as any;
        }

        if (scanSeo) {
          const seoData = auditResults[resultIndex];
          seoScoreOnPage = seoData.score;
          pageSeoDetails = seoData.missingDetails || [];
          pageSeoPassDetails = seoData.passingDetails || [];
        } else {
          pageSeoDetails = undefined as any;
          pageSeoPassDetails = undefined as any;
          seoScoreOnPage = 100;
        }
      } else {
        pageSeoDetails = [`Functional Failure Node: Server error [HTTP ${statusCode}].`];
        pageA11yDetails = [];
        pageSeoPassDetails = [];
      }

      const statusIndicator = statusCode >= 400 ? '❌ FAIL' : '✅ PASS';
      const a11yIndicator = scanA11y ? (a11yErrorsOnPage > 0 ? `⚠️ ${a11yErrorsOnPage} Flags` : 'Clear') : 'Disabled';
      const seoIndicator = scanSeo ? (seoScoreOnPage === 100 ? 'Optimal' : `⚠️ ${seoScoreOnPage}/100`) : 'Disabled';

      console.log(`[Running: ${currentProgress}/${calculatedTotal}] ${statusIndicator} | HTTP ${statusCode} | Accessibility: ${a11yIndicator} | SEO: ${seoIndicator}`);
      console.log(`   🔗 Path: ${url}\n`);

      structuredPagesList.push({
        url,
        status: statusCode,
        a11yErrors: a11yErrorsOnPage,
        seoScore: seoScoreOnPage,
        a11yDetails: pageA11yDetails,
        seoDetails: pageSeoDetails,
        seoPassDetails: pageSeoPassDetails,
        screenshotPath
      });

      return { a11yErrors: a11yErrorsOnPage, seoScore: seoScoreOnPage };
    });
  } catch (err) {
    console.error('Pipeline exception:', err);
  } finally {
    process.on('SIGINT', handleInterrupt);
  }

  executionSummary.forEach(crawledPage => {
    const activeMatch = structuredPagesList.find(p => p.url === crawledPage.url);
    if (!activeMatch) {
      structuredPagesList.push({
        url: crawledPage.url,
        status: crawledPage.statusCode,
        a11yErrors: 0,
        seoScore: 0,
        a11yDetails: wasInterrupted ? (undefined as any) : [],
        seoDetails: wasInterrupted ? ['[Run Interrupted] Manual termination.'] : ['Functional Error.'],
        seoPassDetails: wasInterrupted ? (undefined as any) : []
      });
    } else if (!activeMatch.screenshotPath && crawledPage.screenshotPath) {
      activeMatch.screenshotPath = crawledPage.screenshotPath;
    }
  });

  const brokenCount = structuredPagesList.filter(r => r.status >= 400).length;

  console.log('========================================================================');
  console.log('                    RELEASE READINESS SCORECARD                       ');
  console.log('========================================================================');
  console.log(`• Total Unique Application Paths Crawled : ${structuredPagesList.length}`);
  console.log(`• Critical Core Blocking Defects (P1)   : ${brokenCount}`);
  console.log('------------------------------------------------------------------------\n');

  const detailedPayload: DetailedReportData = {
    runId,
    targetUrl: targetSite,
    timestamp: new Date().toLocaleString(),
    brokenCount,
    a11yViolationCount: aggregateA11yIssues,
    pages: structuredPagesList,
    incompletePages: crawler.queue
  };

  generateHistoricReportsHub(detailedPayload);
}
