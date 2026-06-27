import { PageAuditResult } from '../types/audit';
import { compileFunctionalDrawerHtml } from './components/functional';
import { compileAccessibilityDrawerHtml } from './components/a11yDrawer';
import { compileSeoDrawerHtml } from './components/seoDrawer';

export { renderHistoryRowTemplate } from './components/historyRow';

/**
 * Dynamically builds page accordions using percentage CSS grids.
 * Positions full-page accessibility screenshots exclusively at the top of the A11y drawer.
 */
export function renderPageBlockTemplate(p: PageAuditResult): string {
  const pageScore = typeof p.seoScore === 'number' ? p.seoScore : 100;
  const pageHashId = p.url.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);

  const drawerFunctional = compileFunctionalDrawerHtml(p);

  let a11yAccordionWrapper = '';
  const wasA11yRun = p.a11yDetails !== undefined && Array.isArray(p.a11yDetails);
  
  if (wasA11yRun) {
    const drawerAccessibility = compileAccessibilityDrawerHtml(p.a11yDetails);
    
    // 🔥 FIX: Embed full-page evidence screenshot EXCLUSIVELY at the TOP of the A11y drawer
    const screenshotButtonHeader = p.screenshotPath ? `
      <div style="margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px dashed #e2e8f0;">
         <a href="${p.screenshotPath}" target="_blank" style="display: inline-flex; background: #0f172a; color: #ffffff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; border: 1px solid #0f172a; transition: background 0.15s;">
            📸 View Full Page Visual Evidence Link (All Violations Outlined)
         </a>
      </div>` : '';

    a11yAccordionWrapper = `
      <details style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.01);" id="a11y_${pageHashId}">
          <summary style="padding: 14px 18px; font-size: 13px; font-weight: 700; color: #1e293b; cursor: pointer; display: flex; align-items: center; gap: 8px; border-radius: 6px; background: #f1f5f9; list-style: none;">
             <span class="sub-arrow">▶</span> Accessibility Compliance Trace (Axe-Core Breakdown)
          </summary>
          <div style="padding: 18px; background: #fafafa; border-top: 1px solid #e2e8f0; box-sizing: border-box; width: 100%;">
              ${screenshotButtonHeader}
              ${drawerAccessibility}
          </div>
      </details>`;
  }

  let seoAccordionWrapper = '';
  const wasSeoRun = p.seoDetails !== undefined && p.seoPassDetails !== undefined;
  
  if (wasSeoRun) {
    const isDisabledNotice = p.seoDetails.length === 1 && p.seoDetails.includes('disabled for this run segment');
    
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

  // Standalone pill elements
  const statusPill = `<span style="padding: 6px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-block; ${p.status >= 400 ? 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;' : 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;'}" onclick="document.getElementById('${pageHashId}').setAttribute('open','true'); document.getElementById('func_${pageHashId}').setAttribute('open','true');">Functional Details</span>`;
  
  const a11yPill = wasA11yRun 
    ? `<span style="padding: 6px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-block; ${p.a11yErrors > 0 ? 'background: #fff5f5; color: #e53e3e; border: 1px solid #fed7d7;' : 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;'}" onclick="document.getElementById('${pageHashId}').setAttribute('open','true'); document.getElementById('a11y_${pageHashId}').setAttribute('open','true');">A11y: ${p.a11yErrors} Issues</span>`
    : `<span style="padding: 6px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; display: inline-block; cursor: not-allowed;">A11y: Skipped</span>`;

  const seoPill = wasSeoRun && !(p.seoDetails.length === 1 && p.seoDetails.includes('disabled for this run segment'))
    ? `<span style="padding: 6px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-block; ${pageScore < 100 ? 'background: #fffbeb; color: #d97706; border: 1px solid #fef3c7;' : 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;'}" onclick="document.getElementById('${pageHashId}').setAttribute('open','true'); document.getElementById('seo_${pageHashId}').setAttribute('open','true');">SEO: ${pageScore}/100</span>`
    : `<span style="padding: 6px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; display: inline-block; cursor: not-allowed;">SEO: Skipped</span>`;

  return `
    <details style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; width: 100%; display: block;" class="page-accordion" id="${pageHashId}">
        <summary style="display: grid; grid-template-columns: 70% 30%; align-items: center; padding: 18px 24px; cursor: pointer; user-select: none; background: #ffffff; list-style: none; font-weight: 600; border-radius: 8px; width: 100%; box-sizing: border-box;">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex-grow: 1; padding-right: 20px;">
                <span style="color: #64748b; font-size: 12px; transition: transform 0.2s; flex-shrink: 0;" class="accordion-arrow">▶</span>
                <span style="font-size: 14px; color: #0f172a; word-break: break-all; overflow-wrap: anywhere; font-weight: 600; line-height: 1.4; display: block; width: 100%; min-width: 0;">${p.url}</span>
                <button onclick="event.preventDefault(); navigator.clipboard.writeText('${p.url}'); this.innerText='✓'; setTimeout(() => this.innerText='Copy', 1500);" style="margin-left: 8px; background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; flex-shrink: 0; display: inline-block; vertical-align: middle;">Copy</button>
            </div>
            
            <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center; width: 100%; box-sizing: border-box; flex-shrink: 0;" onclick="event.stopPropagation();">
                ${statusPill}
                ${a11yPill}
                ${seoPill}
            </div>
        </summary>
        
        <div style="padding: 20px; border-top: 1px solid #f1f5f9; background: #fafafa; box-sizing: border-box; width: 100%;">
            <details style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.01);" id="func_${pageHashId}">
                <summary style="padding: 14px 18px; font-size: 13px; font-weight: 700; color: #1e293b; cursor: pointer; display: flex; align-items: center; gap: 8px; border-radius: 6px; background: #f1f5f9; list-style: none;">
                   <span class="sub-arrow">▶</span> Functional Connection & Gateway Trace Details
                </summary>
                <div style="padding: 18px; background: #fafafa; border-top: 1px solid #e2e8f0;">${drawerFunctional}</div>
            </details>

            ${a11yAccordionWrapper}
            
            ${seoAccordionWrapper}
        </div>
    </details>`;
}
