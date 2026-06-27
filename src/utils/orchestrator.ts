import { WebCrawler } from '../crawler/crawler';
import { runAccessibilityAudit } from '../auditors/accessibility';
import { runSeoAudit } from '../auditors/seo';
import { generateHistoricReportsHub } from '../reporter/reporter';
import { DetailedReportData, PageAuditResult, DeviceFormFactor } from '../types/audit';

/**
 * Manages concurrent validation task blocks, handles dynamic console telemetry metrics,
 * and executes fault-tolerant, status-aware backfills for incomplete page data pools.
 */
export async function executeSiteAudit(
  targetSite: string,
  scanA11y: boolean,
  scanSeo: boolean,
  headless: boolean,
  deviceMode: DeviceFormFactor,
  pageCapValue: number
): Promise<void> {
  const runId = Math.random().toString(36).substring(2, 7).toUpperCase();

  console.log('\n========================================================================');
  console.log(`🚀 AUTOMATED RELEASE AUDIT PIPELINE INITIALIZED [RUN ID: ${runId}]`);
  console.log(`🎯 Target Platform  : ${targetSite}`);
  console.log(`📱 Device Emulation : ${deviceMode.toUpperCase()}`);
  console.log(`⚙️  Inspection Tiers : P1 (Functional Stability) | A11y: ${scanA11y ? 'ON' : 'OFF'} | SEO: ${scanSeo ? 'ON' : 'OFF'}`);
  console.log('========================================================================\n');
  console.log('--- STARTING SITE DISCOVERY & COMPLIANCE SCAN ---\n');

  const crawler = new WebCrawler(targetSite);
  const structuredPagesList: PageAuditResult[] = [];
  let aggregateA11yIssues = 0;
  let wasInterrupted = false;

  const handleInterrupt = (): void => {
    if (!wasInterrupted) {
      console.log('\n\n⚠️  [USER TERMINATION DETECTED] Forcefully halting execution loop...');
      console.log('💾 Compiling active records and packing current structural metrics data...');
      wasInterrupted = true;
      crawler.stopGracefully();
    }
  };
  process.on('SIGINT', handleInterrupt);

  let executionSummary: any[] = [];
  try {
    // Forward the pageCapValue directly into the crawler engine parameters definition layer
    executionSummary = await crawler.startCrawl(headless, runId, deviceMode, pageCapValue, async (page, url, statusCode, currentProgress, calculatedTotal) => {

      let a11yErrorsOnPage = 0;
      let seoScoreOnPage = 100;
      let pageA11yDetails: any[] = [];
      let pageSeoDetails: string[] = [];
      let pageSeoPassDetails: string[] = [];

      if (statusCode < 400) {
        const tasks: Promise<any>[] = [];
        if (scanA11y) tasks.push(runAccessibilityAudit(page, url, runId, currentProgress));
        if (scanSeo) tasks.push(runSeoAudit(page, url, deviceMode));

        const auditResults = await Promise.all(tasks);

        let resultIndex = 0;
        if (scanA11y) {
          const a11yData = auditResults[resultIndex++];
          a11yErrorsOnPage = a11yData.violationCount;
          pageA11yDetails = a11yData.violations || [];
          aggregateA11yIssues += a11yErrorsOnPage;
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
        pageSeoDetails = [`Functional Failure Node: Target web gateway returned terminal server error code [HTTP ${statusCode}].`];
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
        seoPassDetails: pageSeoPassDetails
      });

      return { a11yErrors: a11yErrorsOnPage, seoScore: seoScoreOnPage };
    });
  } catch (err) {
    console.error('Core automation lifecycle hit critical exception:', err);
  } finally {
    process.off('SIGINT', handleInterrupt);
  }

  // Fault-Tolerance Backfill Step handles aborted/incomplete pages accurately without false positive passes
  executionSummary.forEach(crawledPage => {
    const activeMatch = structuredPagesList.find(p => p.url === crawledPage.url);
    if (!activeMatch) {
      const isResponseError = crawledPage.statusCode >= 400;

      structuredPagesList.push({
        url: crawledPage.url,
        status: crawledPage.statusCode,
        a11yErrors: 0,
        seoScore: 0,
        a11yDetails: wasInterrupted ? (undefined as any) : [],
        seoDetails: wasInterrupted
          ? ['[Run Interrupted] Process terminated manually before Lighthouse analysis could execute.']
          : isResponseError
            ? [`Functional Failure: Web engine received error code [HTTP ${crawledPage.statusCode}]. Compliance tasks aborted.`]
            : ['Functional Error: Route map dropped before validation tasks finished execution.'],
        seoPassDetails: wasInterrupted ? (undefined as any) : []
      });
    } else {
      activeMatch.screenshotPath = crawledPage.screenshotPath;

      if (wasInterrupted) {
        if (activeMatch.seoScore === 100 && activeMatch.seoPassDetails.length === 0) {
          activeMatch.seoDetails = ['[Run Interrupted] Execution halted during live page inspection.'];
          activeMatch.seoPassDetails = undefined as any;
          activeMatch.a11yDetails = undefined as any;
        }
      }
    }
  });

  const brokenCount = structuredPagesList.filter(r => r.status >= 400).length;

  console.log('========================================================================');
  console.log('                    RELEASE READINESS SCORECARD                       ');
  console.log('========================================================================');
  console.log(`• Total Unique Application Paths Crawled : ${structuredPagesList.length}`);
  console.log(`• Critical Core Blocking Defects (P1)   : ${brokenCount === 0 ? '0 (Clear)' : `${brokenCount} Error(s) detected`}`);
  console.log(`• Digital Accessibility Compliance Flags : ${scanA11y ? `${aggregateA11yIssues} Warnings flagged` : 'Tier Skipped'}`);
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
