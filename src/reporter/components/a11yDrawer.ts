import { A11yErrorDetail } from '../../types/audit';
import { renderA11yViolationCard } from './a11yCard';

export function compileAccessibilityDrawerHtml(a11yDetailsList: A11yErrorDetail[]): string {
  // 🔥 FIX: Explicitly check for undefined states triggered by a manual test interruption
  if (a11yDetailsList === undefined) {
    return `
      <div style="background: #fff7ed; border: 1px solid #ffedd5; color: #c2410c; padding: 14px 16px; border-radius: 6px; font-size: 13px; font-weight: 500;">
         ⚠️ [SKIPPED] Test compilation manually interrupted via terminal before Axe compliance evaluations completed.
      </div>`;
  }

  if (a11yDetailsList.length === 0) {
    return `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; padding: 14px 16px; border-radius: 6px; font-size: 13px; font-weight: 500;">
         [PASS] Accessibility rules verified successfully against WCAG 2.1 AA benchmarks. 0 violations located on this route layout.
      </div>`;
  }
  
  let combinedCards = '';
  for (const error of a11yDetailsList) {
    combinedCards += renderA11yViolationCard(error);
  }
  return combinedCards;
}
