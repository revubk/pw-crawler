"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPageBlockTemplate = renderPageBlockTemplate;
exports.renderHistoryRowTemplate = renderHistoryRowTemplate;
/**
 * Generates an expandable page card layout block with nested sub-accordions
 */
function renderPageBlockTemplate(p) {
    const a11yDetailsList = p.a11yDetails || [];
    const seoDetailsList = p.seoDetails || [];
    const pageScore = typeof p.seoScore === 'number' ? p.seoScore : 100;
    // 1. GENERATE ACCESSIBILITY COMPLIANCE INTERACTIVE BLOCK
    let a11yBlock = `
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; padding: 14px 16px; border-radius: 6px; font-size: 13px; font-weight: 500;">
       💚 <strong>VALIDATED PASS:</strong> Accessibility rules verified successfully against WCAG 2.1 AA benchmarks. 0 violations located on this route structure.
    </div>`;
    if (a11yDetailsList.length > 0) {
        let itemsHtml = '';
        for (const err of a11yDetailsList) {
            const hasSelector = err.targetSelector && err.targetSelector !== 'undefined';
            const cleanSelector = hasSelector ? err.targetSelector : 'Global Layer Frame Wrapper Context';
            itemsHtml += `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.01);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: #fee2e2; color: #991b1b;">${err.impact}</span>
            <strong style="color: #0f172a; font-size: 13px;">Rule: ${err.id}</strong>
          </div>
          <p style="font-size: 13px; color: #475569; margin: 0 0 6px 0; line-height: 1.4;">${err.description}</p>
          <div style="font-size: 13px; color: #059669; font-weight: 500; margin-bottom: 10px;">💡 <strong>Fix:</strong> ${err.help}</div>
          
          <div style="display: grid; grid-template-columns: 100px 1fr; gap: 6px; font-size: 12px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
            <div style="color: #64748b; font-weight: 600;">Text Label:</div>
            <div style="color: #0f172a;">"${err.elementText || 'None / Graphical Element'}"</div>
            <div style="color: #64748b; font-weight: 600;">Selector:</div>
            <div style="color: #334155; font-family: monospace; font-size: 11px; word-break: break-all;">${cleanSelector}</div>
          </div>

          ${hasSelector && err.htmlSnippet !== 'N/A' ? `
          <div style="margin-top: 8px;">
            <pre style="margin: 0; background: #0f172a; color: #38bdf8; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 11px; overflow-x: auto; line-height: 1.3;">${escapeHtml(err.htmlSnippet)}</pre>
          </div>` : ''}

          <!-- 📸 NESTED ACCORDION SUB-TEMPLATE FOR HIGH-LIGHTED ELEMENT SNAPSHOT -->
          ${err.elementScreenshotPath ? `
            <details style="margin-top: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
              <summary style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; user-select: none; display: flex; align-items: center; gap: 6px; background: #f1f5f9;">
                <span>▶</span> 📷 View Context Highlight Crop Preview
              </summary>
              <div style="padding: 12px; text-align: center; background: #ffffff;">
                <img src="${err.elementScreenshotPath}" alt="Element highlight snapshot" style="max-width: 100%; height: auto; border: 1px solid #cbd5e1; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);" />
              </div>
            </details>
          ` : ''}
        </div>`;
        }
        a11yBlock = `<div>${itemsHtml}</div>`;
    }
    // 2. GENERATE TECHNICAL SEO AUDIT RESULTS BLOCK
    let seoBlock = `
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; padding: 14px 16px; border-radius: 6px; font-size: 13px; font-weight: 500;">
       💚 <strong>VALIDATED PASS:</strong> Technical metadata indexing check verified. All target structured crawling descriptors extracted successfully.
    </div>`;
    if (pageScore < 100 || seoDetailsList.length > 0) {
        let itemsHtml = '';
        const finalSeoErrorsList = seoDetailsList.length > 0 ? seoDetailsList : ['Lighthouse Target Requirement Warning: Baseline metadata elements absent.'];
        for (const seoBug of finalSeoErrorsList) {
            itemsHtml += `
        <div style="background: #fffbec; border: 1px solid #fde68a; color: #92400e; padding: 10px 14px; border-radius: 6px; font-size: 13px; font-weight: 500; margin-bottom: 8px; line-height: 1.4;">
           ⚠️ ${seoBug}
        </div>`;
        }
        seoBlock = `<div>${itemsHtml}</div>`;
    }
    const statusClass = p.status >= 400 ? 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;' : 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;';
    const a11yClass = p.a11yErrors > 0 ? 'background: #fff5f5; color: #e53e3e; border: 1px solid #fed7d7;' : 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;';
    const seoClass = pageScore < 100 ? 'background: #fffbeb; color: #d97706; border: 1px solid #fef3c7;' : 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;';
    return `
    <details style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden;" class="page-accordion">
        <summary style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; cursor: pointer; user-select: none; background: #ffffff; list-style: none; font-weight: 600; flex-wrap: wrap; gap: 12px; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #64748b; font-size: 12px; transition: transform 0.2s;" class="accordion-arrow">▶</span>
                <span style="font-size: 14px; color: #2563eb; word-break: break-all;">${p.url}</span>
            </div>
            <div style="display: flex; gap: 8px;" onclick="event.preventDefault();">
                <span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; ${statusClass}">HTTP ${p.status}</span>
                <span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; ${a11yClass}">A11y: ${p.a11yErrors} Issues</span>
                <span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; ${seoClass}">SEO: ${pageScore}/100</span>
            </div>
        </summary>
        
        <div style="padding: 20px; border-top: 1px solid #f1f5f9; background: #fafafa;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
                <div>
                    <h4 style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin: 0 0 10px 0; letter-spacing: 0.5px;">♿ Accessibility Audit Findings</h4>
                    ${a11yBlock}
                </div>
                <div>
                    <h4 style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin: 0 0 10px 0; letter-spacing: 0.5px;">🔍 SEO Audit Findings</h4>
                    ${seoBlock}
                </div>
            </div>
            ${p.screenshotPath ? `
              <div style="margin-top: 16px; padding-top: 12px; border-top: 1px dashed #e2e8f0;">
                 <a href="${p.screenshotPath}" target="_blank" style="display: inline-flex; background: #0f172a; color: #ffffff; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: 600;">
                    📸 View Full Page Visual Evidence
                 </a>
              </div>` : ''}
        </div>
    </details>`;
}
/**
 * 🔥 UPDATED: History layout row row to capture SEO metric parameters
 */
function renderHistoryRowTemplate(h) {
    const seoAlertColor = h.avgSeoScore < 100 ? 'color: #ca8a04; font-weight: 600;' : 'color: #16a34a;';
    return `
    <tr class="clickable-row" data-href="${h.reportFilename}">
        <td>${h.timestamp}</td>
        <td style="font-weight: 500; color: #0f172a;">${h.targetUrl}</td>
        <td>${h.totalScanned} pages</td>
        <td style="color: ${h.brokenCount > 0 ? '#dc2626' : '#64748b'}; font-weight: ${h.brokenCount > 0 ? '600' : 'normal'};">${h.brokenCount}</td>
        <td style="color: ${h.a11yViolations > 0 ? '#dc2626' : '#64748b'}; font-weight: ${h.a11yViolations > 0 ? '600' : 'normal'};">${h.a11yViolations}</td>
        <!-- 🔥 NEW COLUMN: Tracking running technical SEO analytics -->
        <td style="${seoAlertColor}">${h.avgSeoScore}/100</td>
    </tr>`;
}
function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
