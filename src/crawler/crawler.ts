import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export interface CrawlResult {
  url: string;
  statusCode: number;
  isBroken: boolean;
  screenshotPath?: string;
}

export class WebCrawler {
  private visitedUrls: Set<string> = new Set();
  private queue: string[] = [];
  private baseUrl: string;

  constructor(startUrl: string) {
    this.baseUrl = new URL(startUrl).origin;
    this.queue.push(startUrl);
    
    const screenshotDir = path.join(process.cwd(), 'reports', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  }

  public async startCrawl(
    headless: boolean, 
    runId: string,
    onPageDiscover: (page: Page, url: string, statusCode: number) => Promise<{ a11yErrors: number; seoScore: number }>
  ): Promise<CrawlResult[]> {
    const browser = await chromium.launch({ headless, slowMo: headless ? 0 : 300 });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const results: CrawlResult[] = [];

    while (this.queue.length > 0) {
      const currentUrl = this.queue.shift()!;
      
      // Clean url formatting (strip hashes/anchors) to avoid duplicate crawling
      const cleanCurrentUrl = currentUrl.split('#')[0];
      if (this.visitedUrls.has(cleanCurrentUrl)) continue;
      this.visitedUrls.add(cleanCurrentUrl);

      const page = await context.newPage();

      try {
        // Playwright navigates and automatically waits for the network to be quiet
        const response = await page.goto(cleanCurrentUrl, { 
          waitUntil: 'networkidle', 
          timeout: 45000 
        });
        
        await page.waitForLoadState('load');
        await page.waitForTimeout(1000); // Small cushion for dynamic rendering

        const status = response ? response.status() : 500;
        const isBroken = status >= 400;

        // Run accessibility and SEO audits on the page
        const auditMetrics = await onPageDiscover(page, cleanCurrentUrl, status);

        let screenshotFilename: string | undefined = undefined;
        if (isBroken || auditMetrics.a11yErrors > 0) {
          const fileSafeName = cleanCurrentUrl.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
          screenshotFilename = `screenshots/fail_${runId}_${fileSafeName}.png`;
          const fullPath = path.join(process.cwd(), 'reports', screenshotFilename);
          await page.screenshot({ path: fullPath, fullPage: true });
        }

        results.push({ 
          url: cleanCurrentUrl, 
          statusCode: status, 
          isBroken,
          screenshotPath: screenshotFilename
        });

        // 🔗 PLAYWRIGHT NATIVE LINK DISCOVERY
        if (!isBroken) {
          // Locate all anchors on the page using standard Playwright locators
          const anchorLocators = page.locator('a[href]');
          const count = await anchorLocators.count();

          for (let i = 0; i < count; i++) {
            const href = await anchorLocators.nth(i).getAttribute('href');
            if (href) {
              try {
                // Convert relative paths into absolute URLs automatically
                const absoluteUrl = new URL(href, cleanCurrentUrl).href;
                const cleanAbsoluteUrl = absoluteUrl.split('#')[0];

                // Ensure the link belongs to the same domain and hasn't been visited
                if (cleanAbsoluteUrl.startsWith(this.baseUrl) && !this.visitedUrls.has(cleanAbsoluteUrl) && !this.queue.includes(cleanAbsoluteUrl)) {
                  this.queue.push(cleanAbsoluteUrl);
                }
              } catch (_) {
                // Ignore invalid or unparseable links (e.g., mailto: or tel:)
              }
            }
          }
        }
      } catch (error) {
        const fileSafeName = cleanCurrentUrl.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
        const screenshotFilename = `screenshots/fail_${runId}_${fileSafeName}.png`;
        const fullPath = path.join(process.cwd(), 'reports', screenshotFilename);
        try { await page.screenshot({ path: fullPath, fullPage: true }); } catch (_) {}

        results.push({ url: cleanCurrentUrl, statusCode: 500, isBroken: true, screenshotPath: screenshotFilename });
      } finally {
        await page.close();
      }
    }

    await browser.close();
    return results;
  }
}
