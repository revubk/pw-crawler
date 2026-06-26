import { Page } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

export interface AccessibilityAuditResult {
  url: string;
  violationCount: number;
  violations: any[];
}

export async function runAccessibilityAudit(page: Page, url: string): Promise<AccessibilityAuditResult> {
  try {
    const results = await new AxeBuilder({ page }).analyze();
    return {
      url,
      violationCount: results.violations.length,
      violations: results.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help
      }))
    };
  } catch (error) {
    return { url, violationCount: 0, violations: [] };
  }
}
