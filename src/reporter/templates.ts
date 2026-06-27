import { PageAuditResult } from '../types/audit';
import { compileFunctionalDrawerHtml } from './components/functional';
import { compileAccessibilityDrawerHtml } from './components/a11yDrawer';
import { compileSeoDrawerHtml } from './components/seoDrawer';

export { renderHistoryRowTemplate } from './components/historyRow';

/**
 * Dynamically builds page accordions, completely hiding drawers that were skipped in the run configuration.
 */
export function renderPageBlockTemplate(p: PageAuditResult): string {
  const pageScore = typeof p.seoScore === 'number' ? p.seoScore : 100;
  const pageHashId = p.url.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);

  // 1. Functional Drawer — Always compiled as part of the core stability tier
  const drawerFunctional = compileFunctionalDrawerHtml(p);

  // 2. Accessibility Drawer — Only build if the array is present and wasn't skipped
  let a11yAccordionWrapper = '';
  const wasA11yRun = p.a11yDetails !== undefined && Array.isArray(p.a11yDetails);
  
  if (wasA11yRun) {
    const drawerAccessibility = compileAccessibilityDrawerHtml(p.a11yDetails);
    a11yAccordionWrapper = `
      <details style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.01);" id="a11y_${pageHashId}">
          <summary style="padding: 14px 18px; font-size: 13px; font-weight: 700; color: #1e293b; cursor: pointer; display: flex; align-items: center; gap: 8px; border-radius: 6px; background: #f1f5f9; list-style: none;">
             <span class="sub-arrow">▶</span> Accessibility Compliance Trace (Axe-Core Breakdown)
          </summary>
          <div style="padding: 18px; background: #fafafa; border-top: 1px solid #e2e8f0;">${drawerAccessibility}</div>
      </details>`;
  }

  // 3. Technical SEO Drawer — Only build if the arrays are initialized and wasn't skipped
  let seoAccordionWrapper = '';
  const wasSeoRun = p.seoDetails !== undefined && p.seoPassDetails !== undefined;
  
  if (wasSeoRun) {
    // Check if it was explicitly marked as disabled by our orchestrator configuration fallback
    const isDisabledNotice = p.seoDetails.length === 1 && p.seoDetails[0].includes('disabled for this run segment');
    
    if (!isDisabledNotice) {
      const drawerSeo = compileSeoDrawerHtml(p.seoDetails, p.seoPassDetails);
      seoAccordionWrapper = `
        <details style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.01);" id="seo_${pageHashId}">
            <summary style="padding: 14px 18px; font-size: 13px; font-weight: 700; color: #1e293b; cursor: pointer; display: flex; align-items: center; gap: 8px; border-radius: 6px; background: #f1f5f9; list-style: none;">
               <span class="sub-arrow">▶</span> Programmatic Lighthouse SEO Audit Verification Records
            </summary>
            <div style="padding: 18px; background: #fafafa; border-top: 1px solid #e2e8f0;">${drawerSeo}</div>
        </details>`;
    }
  }

  // Dynamic Pill Headers Configuration depending on configuration states
  const statusPill = `<span style="padding: 5px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; cursor: pointer; ${p.status >= 400 ? 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;' : 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;'}" onclick="document.getElementById('${pageHashId}').setAttribute('open','true'); document.getElementById('func_${pageHashId}').setAttribute('open','true');">Functional Details</span>`;
  
  const a11yPill = wasA11yRun 
    ? `<span style="padding: 5px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; cursor: pointer; ${p.a11yErrors > 0 ? 'background: #fff5f5; color: #e53e3e; border: 1px solid #fed7d7;' : 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;'}" onclick="document.getElementById('${pageHashId}').setAttribute('open','true'); document.getElementById('a11y_${pageHashId}').setAttribute('open','true');">A11y: ${p.a11yErrors} Issues</span>`
    : `<span style="padding: 5px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; cursor: not-allowed;">A11y: Skipped</span>`;

  const seoPill = wasSeoRun && !(p.seoDetails.length === 1 && p.seoDetails[0].includes('disabled for this run segment'))
    ? `<span style="padding: 5px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; cursor: pointer; ${pageScore < 100 ? 'background: #fffbeb; color: #d97706; border: 1px solid #fef3c7;' : 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;'}" onclick="document.getElementById('${pageHashId}').setAttribute('open','true'); document.getElementById('seo_${pageHashId}').setAttribute('open','true');">SEO: ${pageScore}/100</span>`
    : `<span style="padding: 5px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; cursor: not-allowed;">SEO: Skipped</span>`;

  return `
    <details style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden;" class="page-accordion" id="${pageHashId}">
        <summary style="display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; cursor: pointer; user-select: none; background: #ffffff; list-style: none; font-weight: 600; flex-wrap: wrap; gap: 12px; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #64748b; font-size: 12px; transition: transform 0.2s;" class="accordion-arrow">▶</span>
                <span style="font-size: 14px; color: #0f172a; word-break: break-all; font-weight: 600;">${p.url}</span>
                <button onclick="event.preventDefault(); navigator.clipboard.writeText('${p.url}'); this.innerText='✓'; setTimeout(() => this.innerText='Copy', 1500);" style="margin-left: 8px; background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">Copy</button>
            </div>
            
            <div style="display: flex; gap: 8px;" onclick="event.stopPropagation();">
                ${statusPill}
                ${a11yPill}
                ${seoPill}
            </div>
        </summary>
        
        <div style="padding: 20px; border-top: 1px solid #f1f5f9; background: #fafafa;">
            <details style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.01);" id="func_${pageHashId}">
                <summary style="padding: 14px 18px; font-size: 13px; font-weight: 700; color: #1e293b; cursor: pointer; display: flex; align-items: center; gap: 8px; border-radius: 6px; background: #f1f5f9; list-style: none;">
                   <span class="sub-arrow">▶</span> Functional Connection & Gateway Trace Details
                </summary>
                <div style="padding: 18px; background: #fafafa; border-top: 1px solid #e2e8f0;">${drawerFunctional}</div>
            </details>

            ${a11yAccordionWrapper}
            
            ${seoAccordionWrapper}

            ${p.screenshotPath ? `
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed #e2e8f0;">
                 <a href="${p.screenshotPath}" target="_blank" style="display: inline-flex; background: #0f172a; color: #ffffff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">
                    📸 View Full Page Visual Evidence Link
                 </a>
              </div>` : ''}
        </div>
    </details>`;
}
