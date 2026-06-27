import { RunHistoryRecord } from '../../types/audit';

export function renderHistoryRowTemplate(h: RunHistoryRecord): string {
  const seoAlertColor = h.avgSeoScore < 100 ? 'color: #ca8a04; font-weight: 600;' : 'color: #16a34a; font-weight: 600;';
  return `
    <tr class="clickable-row" data-href="${h.reportFilename}">
        <td style="padding: 16px; font-size: 14px; color: #475569;">${h.timestamp}</td>
        <td style="padding: 16px; font-size: 14px; font-weight: 600; color: #0f172a;">${h.targetUrl}</td>
        <td style="padding: 16px; font-size: 14px; color: #475569;">${h.totalScanned} pages</td>
        <td style="padding: 16px; font-size: 14px; color: ${h.brokenCount > 0 ? '#dc2626' : '#475569'}; font-weight: ${h.brokenCount > 0 ? '600' : 'normal'};">${h.brokenCount}</td>
        <td style="padding: 16px; font-size: 14px; color: ${h.a11yViolations > 0 ? '#dc2626' : '#475569'}; font-weight: ${h.a11yViolations > 0 ? '600' : 'normal'};">${h.a11yViolations}</td>
        <td style="padding: 16px; font-size: 14px; ${seoAlertColor}">${h.avgSeoScore}/100</td>
    </tr>`;
}
