import * as dotenv from 'dotenv';
import inquirer from 'inquirer';
import { WebCrawler } from './crawler/crawler';
import { runAccessibilityAudit } from './auditors/accessibility';
import { runSeoAudit } from './auditors/seo';
import { generateHistoricReportsHub } from './reporter/reporter';
import { DetailedReportData, PageAuditResult } from './types/audit';

dotenv.config();

async function executeSiteAudit(targetSite: string, scanA11y: boolean, scanSeo: boolean, headless: boolean) {
  const runId = Math.random().toString(36).substring(2, 7).toUpperCase();
  
  console.log('\n========================================================================');
  console.log(`🚀 AUTOMATED RELEASE AUDIT PIPELINE INITIALIZED [RUN ID: ${runId}]`);
  console.log(`🎯 Target Platform  : ${targetSite}`);
  console.log(`⚙️  Inspection Tiers : P1 (Functional Stability) | A11y: ${scanA11y ? 'ON' : 'OFF'} | SEO: ${scanSeo ? 'ON' : 'OFF'}`);
  console.log('========================================================================\n');
  console.log('--- STARTING SITE DISCOVERY & COMPLIANCE SCAN ---\n');

  const crawler = new WebCrawler(targetSite);
  const structuredPagesList: PageAuditResult[] = [];
  let aggregateA11yIssues = 0;
  let wasInterrupted = false;

  const handleInterrupt = () => {
    if (!wasInterrupted) {
      console.log('\n\n⚠️  [USER TERMINATION DETECTED] Forcefully halting execution loop...');
      wasInterrupted = true;
      crawler.stopGracefully();
    }
  };
  process.on('SIGINT', handleInterrupt);

  let executionSummary: any[] = [];
  try {
    // Connect progress metadata variables from crawling engine loop
    executionSummary = await crawler.startCrawl(headless, runId, async (page, url, statusCode, currentProgress, calculatedTotal) => {
      let a11yErrorsOnPage = 0;
      let seoScoreOnPage = 100;
      let pageA11yDetails: any[] = [];
      let pageSeoDetails: string[] = [];

      if (statusCode < 400) {
        const tasks: Promise<any>[] = [];
        // 🔥 PASSING PROGRESS INDICES FOR HIGH-QUALITY CROPPED IMAGE LABELS
        if (scanA11y) tasks.push(runAccessibilityAudit(page, url, runId, currentProgress));
        if (scanSeo) tasks.push(runSeoAudit(page, url));

        const auditResults = await Promise.all(tasks);

        let resultIndex = 0;
        if (scanA11y) {
          const a11yData = auditResults[resultIndex++];
          a11yErrorsOnPage = a11yData.violationCount;
          pageA11yDetails = a11yData.violations || [];
          aggregateA11yIssues += a11yErrorsOnPage;
        }
        if (scanSeo) {
          const seoData = auditResults[resultIndex];
          seoScoreOnPage = seoData.score;
          pageSeoDetails = seoData.missingDetails || [];
        }
      } else {
        pageSeoDetails = ['Functional Failure: Core web server returned an error response block.'];
      }

      // Live Business Telemetry Console Report
      const statusIndicator = statusCode >= 400 ? '❌ FAIL' : '✅ PASS';
      const a11yIndicator = a11yErrorsOnPage > 0 ? `⚠️ ${a11yErrorsOnPage} Flags` : '💚 Clear';
      const seoIndicator = seoScoreOnPage === 100 ? '💯 Optimal' : `⚠️ ${seoScoreOnPage}/100`;

      console.log(`[Running: ${currentProgress}/${calculatedTotal}] ${statusIndicator} | HTTP ${statusCode} | Accessibility: ${a11yIndicator} | SEO: ${seoIndicator}`);
      console.log(`   🔗 Path: ${url}\n`);

      structuredPagesList.push({
        url,
        status: statusCode,
        a11yErrors: a11yErrorsOnPage,
        seoScore: scanSeo ? seoScoreOnPage : 100,
        a11yDetails: pageA11yDetails,
        seoDetails: pageSeoDetails
      });

      return { a11yErrors: a11yErrorsOnPage, seoScore: seoScoreOnPage };
    });
  } catch (err) {
    console.error('Core script execution failure exception:', err);
  } finally {
    process.off('SIGINT', handleInterrupt);
  }

  // Handle backfill formatting for unvisited links or dropped timeout items
  executionSummary.forEach(crawledPage => {
    const activeMatch = structuredPagesList.find(p => p.url === crawledPage.url);
    if (!activeMatch) {
      structuredPagesList.push({
        url: crawledPage.url,
        status: crawledPage.statusCode,
        a11yErrors: 0,
        seoScore: 0,
        a11yDetails: [],
        seoDetails: ['Functional Failure: Connection dropped early.'],
        screenshotPath: crawledPage.screenshotPath
      });
    } else {
      activeMatch.screenshotPath = crawledPage.screenshotPath;
    }
  });

  const brokenCount = structuredPagesList.filter(r => r.status >= 400).length;

  console.log('========================================================================');
  console.log('                    RELEASE READINESS SCORECARD                       ');
  console.log('========================================================================');
  console.log(`• Total Unique Application Paths Crawled : ${structuredPagesList.length}`);
  console.log(`• Critical Core Blocking Defects (P1)   : ${brokenCount === 0 ? '0 (Clear 💚)' : `${brokenCount} Error(s) ❌`}`);
  console.log(`• Digital Accessibility Compliance Flags : ${aggregateA11yIssues === 0 ? '0 (Clear 💚)' : `${aggregateA11yIssues} Warnings ⚠️`}`);
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

async function mainTerminalWizard() {
  console.log('==================================================');
  console.log('       Welcome to the Site Auditor Crawler        ');
  console.log('==================================================\n');

  const envUrl = process.env.TARGET_URL || 'https://example.com';

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'urlSource',
      message: 'Select the target website environment source:',
      choices: [
        { name: `Use default from .env file (${envUrl})`, value: 'ENV' },
        { name: 'Type a custom website URL manually', value: 'MANUAL' }
      ]
    },
    {
      type: 'input',
      name: 'customUrl',
      message: 'Enter the full website URL:',
      when: (hash) => hash.urlSource === 'MANUAL',
      validate: (input) => {
        try { new URL(input); return true; } 
        catch (_) { return 'Please enter a valid absolute URL string.'; }
      }
    },
    {
      type: 'list',
      name: 'browserMode',
      message: 'Choose browser visibility mode:',
      choices: [
        { name: 'Headless Mode (Fast, runs silently in background)', value: true },
        { name: 'Headed Mode (Opens visible Playwright UI browser window)', value: false }
      ]
    },
    {
      type: 'checkbox',
      name: 'auditTiers',
      message: 'Select the metrics you want to evaluate on this run:',
      choices: [
        { name: 'Functional Checks (P1 Broken Links/Crashes)', value: 'FUNC', disabled: 'Always Enabled' },
        { name: 'Accessibility Compliance (Axe-Core P2)', value: 'A11Y', checked: true },
        { name: 'Technical SEO Metadata Checklist (Lighthouse Core P2)', value: 'SEO', checked: true }
      ]
    }
  ]);

  const finalUrl = answers.urlSource === 'ENV' ? envUrl : answers.customUrl;
  const runA11y = answers.auditTiers.includes('A11Y');
  const runSeo = answers.auditTiers.includes('SEO');
  const isHeadless = answers.browserMode;

  await executeSiteAudit(finalUrl, runA11y, runSeo, isHeadless);
}

mainTerminalWizard().catch(err => console.error('Wizard failure:', err));
