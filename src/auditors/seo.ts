import { Page } from 'playwright';
// Import the core programmatic Lighthouse module engine
import lighthouse from 'lighthouse';

export interface SeoAuditResult {
  url: string;
  score: number;
  missingDetails: string[];
}

export async function runSeoAudit(page: Page, url: string): Promise<SeoAuditResult> {
  const missingDetails: string[] = [];
  let score = 100;

  try {
    // 🔗 CONNECT PLAYWRIGHT PORT TO LIGHTHOUSE
    // Extract the remote debugging port that Playwright used to launch the browser instance
    const browser = page.context().browser();
    if (!browser) {
      throw new Error('Playwright browser context reference is unreachable.');
    }

    // Parse the endpoint address to isolate the active debugging port number
    const connectUrl = new URL(browser.isConnected() ? browser.contexts()[0]?.pages()[0]?.url() || url : url);
    
    // Execute programmatic Lighthouse scan using the active browser's debugging port
    // We target ONLY the SEO category to optimize execution speed
    const runnerResult = await lighthouse(url, {
      port: 9222, // Matches the dynamic remote debugging port initialized in crawler.ts
      onlyCategories: ['seo'],
      output: 'json'
    });

    if (runnerResult && runnerResult.lhr) {
      const lhr = runnerResult.lhr;
      score = Math.round((lhr.categories.seo.score || 0) * 100);

      // Extract details for all failed audits
      const audits = lhr.audits;
      for (const auditId in audits) {
        const audit = audits[auditId];
        // If an audit fails (score is not 1 or null/not applicable), capture the description
        if (audit.score !== 1 && audit.score !== null && audit.title) {
          let failureMessage = `Lighthouse SEO [${audit.title}]: ${audit.description}`;
          if (audit.displayValue) {
            failureMessage += ` (Detected: ${audit.displayValue})`;
          }
          missingDetails.push(failureMessage);
        }
      }
    }
  } catch (error: any) {
    score = 0;
    missingDetails.push(`Lighthouse Engine Failure: Unable to execute standalone audit. Reason: ${error.message}`);
  }

  return {
    url,
    score,
    missingDetails
  };
}
