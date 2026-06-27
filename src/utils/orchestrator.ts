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
            // Group our errors list array by selector targets to find matches sharing layout planes
            const selectorGroupMap: { [key: string]: number } = {};

            for (const error of pageA11yDetails) {
              const sel = error.targetSelector;
              const ruleId = error.id;
              
              if (sel && sel !== 'html' && sel !== 'body' && sel !== 'main') {
                // Keep track of how many badges are already assigned to this exact element locator selector
                if (!selectorGroupMap[sel]) {
                  selectorGroupMap[sel] = 0;
                }
                const collisionIndexMultiplier = selectorGroupMap[sel];
                selectorGroupMap[sel]++;

                try {
                  const elementLocator = page.locator(sel).first();
                  if (await elementLocator.count() > 0) {
                    // Inject outlines and stack text tags cleanly without using dangerous DOM queries
                    await elementLocator.evaluate((el, config) => {
                      const htmlEl = el as HTMLElement;
                      
                      htmlEl.style.outline = '3px dashed #dc2626';
                      htmlEl.style.outlineOffset = '2px';
                      htmlEl.style.position = 'relative';

                      const badge = document.createElement('div');
                      badge.innerText = `⚠️ AXE BUG: ${config.ruleId}`;
                      
                      badge.style.position = 'absolute';
                      // 🔥 SOLID ARITHMETIC SHIFT: Multiplies index positions to stack badges vertically upwards without breaking
                      const verticalOffset = 22 + (config.offsetIndex * 25);
                      badge.style.top = `-${verticalOffset}px`;
                      badge.style.left = '0';
                      
                      badge.style.backgroundColor = '#dc2626';
                      badge.style.color = '#ffff00';
                      badge.style.fontFamily = 'monospace';
                      badge.style.fontSize = '11px';
                      badge.style.fontWeight = 'bold';
                      badge.style.padding = '3px 8px';
                      badge.style.borderRadius = '4px';
                      badge.style.boxShadow = '0 4px 8px rgba(0,0,0,0.25)';
                      badge.style.border = '1px solid #ffff00';
                      badge.style.zIndex = '99999';
                      badge.style.pointerEvents = 'none';
                      badge.style.whiteSpace = 'nowrap';
                      
                      if (htmlEl.parentElement) {
                        htmlEl.parentElement.appendChild(badge);
                      } else {
                        htmlEl.appendChild(badge);
                      }
                    }, { ruleId, offsetIndex: collisionIndexMultiplier });
                  }
                } catch (_) {
                  // Skip gracefully if an element structure drops mid-evaluation pass
                }
              }
            }

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
