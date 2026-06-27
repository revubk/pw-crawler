import { Page } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { A11yErrorDetail } from '../types/audit';
import * as path from 'path';
import * as fs from 'fs';

export interface AccessibilityAuditResult {
  url: string;
  violationCount: number;
  violations: A11yErrorDetail[];
}

export async function runAccessibilityAudit(page: Page, url: string, runId: string, pageIndex: number): Promise<AccessibilityAuditResult> {
  try {
    const results = await new AxeBuilder({ page }).analyze();
    const enrichedViolations: A11yErrorDetail[] = [];
    const hostName = new URL(url).hostname.replace(/[^a-z0-9]/gi, '_');
    
    let violationIndex = 0;

    for (const violation of results.violations) {
      for (const node of violation.nodes) {
        violationIndex++;
        const selector = node.target.join(' > ');
        
        let htmlSnippet = 'N/A';
        let elementText = 'N/A';
        let elementScreenshotPath: string | undefined = undefined;

        try {
          const elementLocator = page.locator(selector).first();
          
          if (await elementLocator.count() > 0) {
            htmlSnippet = await elementLocator.evaluate(el => el.outerHTML);
            elementText = await elementLocator.innerText();
            
            if (!elementText || elementText.trim().length === 0) {
              elementText = await elementLocator.getAttribute('aria-label') || 'Empty Label';
            }

            // 📸 PLAYWRIGHT NATIVE ELEMENT HIGH-LIGHTING AND CROPPING
            // Scroll the element into view safely before capturing
            await elementLocator.scrollIntoViewIfNeeded();

            // Inject a bold outline style border directly into the browser runtime layout
            await elementLocator.evaluate((el) => {
              (el as HTMLElement).style.outline = '3px solid #dc2626';
              (el as HTMLElement).style.outlineOffset = '3px';
            });

            // Define folder paths and write the cropped image file to disk
            const imgFilename = `screenshots/element_${runId}_p${pageIndex}_v${violationIndex}.png`;
            const fullTargetImgPath = path.join(process.cwd(), 'reports', hostName, imgFilename);
            
            await elementLocator.screenshot({ path: fullTargetImgPath });
            elementScreenshotPath = imgFilename;

            // Remove the temporary validation highlight style outline cleanly
            await elementLocator.evaluate((el) => {
              (el as HTMLElement).style.outline = '';
              (el as HTMLElement).style.outlineOffset = '';
            });
          }
        } catch (_) {
          htmlSnippet = node.html || 'Context missing';
        }

        enrichedViolations.push({
          id: violation.id,
          impact: violation.impact || 'serious',
          description: violation.description,
          help: violation.help,
          targetSelector: selector,
          htmlSnippet: htmlSnippet.substring(0, 300),
          elementText: elementText.trim().substring(0, 100) || 'None',
          elementScreenshotPath
        });
      }
    }

    return {
      url,
      violationCount: enrichedViolations.length,
      violations: enrichedViolations
    };
  } catch (error) {
    return { url, violationCount: 0, violations: [] };
  }
}
