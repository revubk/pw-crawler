import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { DetailedReportData, RunHistoryRecord } from '../types/audit';
import { renderPageBlockTemplate, renderHistoryRowTemplate } from './templates';

export function generateHistoricReportsHub(currentRunData: DetailedReportData): void {
  let hostName = 'default_domain';
  try {
    hostName = new URL(currentRunData.targetUrl).hostname.replace(/[^a-z0-9]/gi, '_');
  } catch (_) {}

  const reportsDir = path.join(process.cwd(), 'reports', hostName);
  const databasePath = path.join(reportsDir, 'history_database.json');
  const indexDashboardPath = path.join(reportsDir, 'index.html');
  const uniqueReportName = `report_${currentRunData.runId}.html`;
  const uniqueReportPath = path.join(reportsDir, uniqueReportName);

  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  // Calculate the average SEO performance metric for the current run session
  const totalSeoScoresSum = currentRunData.pages.reduce((sum, p) => sum + (p.seoScore || 0), 0);
  const calculatedAverageSeoScore = currentRunData.pages.length > 0 
    ? Math.round(totalSeoScoresSum / currentRunData.pages.length) 
    : 100;

  let historyList: RunHistoryRecord[] = [];
  if (fs.existsSync(databasePath)) {
    try {
      historyList = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
    } catch (_) { historyList = []; }
  }

  const newHistoryItem: RunHistoryRecord = {
    runId: currentRunData.runId,
    timestamp: currentRunData.timestamp,
    targetUrl: currentRunData.targetUrl,
    totalScanned: currentRunData.pages.length,
    brokenCount: currentRunData.brokenCount,
    a11yViolations: currentRunData.a11yViolationCount,
    avgSeoScore: calculatedAverageSeoScore, // Map metric property to row configuration
    reportFilename: uniqueReportName
  };
  historyList.unshift(newHistoryItem);
  fs.writeFileSync(databasePath, JSON.stringify(historyList, null, 2), 'utf8');

  let pagesListContent = '';
  for (const p of currentRunData.pages) {
    pagesListContent += renderPageBlockTemplate(p);
  }

  let incompleteBlock = '';
  if (currentRunData.incompletePages && currentRunData.incompletePages.length > 0) {
    let items = '';
    for (const url of currentRunData.incompletePages) {
      items += `<li style="margin-bottom: 4px; font-family: monospace; font-size: 13px; color: #9a3412;">${url}</li>`;
    }
    incompleteBlock = `
      <div style="background: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 10px 0; color: #ea580c; font-size: 14px;">⚠️ Run Interrupted — Incomplete Queue Pages Remaining (${currentRunData.incompletePages.length}):</h4>
        <ul style="margin: 0; padding-left: 20px;">${items}</ul>
      </div>`;
  }

  const individualHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Audit Details — Run #${currentRunData.runId}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f8fafc; padding: 40px; margin: 0; color: #1e293b; }
        .card { background: #ffffff; padding: 40px; border-radius: 12px; max-width: 1200px; margin: 0 auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 20px 25px -5px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 30px; }
        .btn-back { display: inline-flex; align-items: center; margin-bottom: 24px; text-decoration: none; color: #2563eb; font-weight: 600; font-size: 14px; }
        
        details[open] .accordion-arrow { transform: rotate(90deg); }
        summary::-webkit-details-marker { display: none; }
        summary { list-style: none; }
        .page-accordion { transition: border-color 0.2s, box-shadow 0.2s; }
        .page-accordion:hover { border-color: #cbd5e1 !important; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05) !important; }
        .accordion-arrow { display: inline-block; }
        
        /* Nested sub-accordion expansion styling config rules */
        details[open] > summary > span { transform: rotate(90deg); }
    </style>
</head>
<body>
    <div class="card">
        <a href="index.html" class="btn-back">← Return to Dashboard History</a>
        <div class="header">
            <div>
                <!-- 🔥 VERDICT TEXT BADGES ELIMINATED CLEANLY FROM LOG PANEL HEADERS -->
                <h2 style="margin: 0; font-size: 22px; color: #0f172a;">Run Diagnostics Analysis Metrics</h2>
                <p style="margin: 6px 0 0 0; color: #64748b; font-size: 14px;">Domain URL Node: <strong style="color: #0f172a;">${currentRunData.targetUrl}</strong> | Run Timestamp: ${currentRunData.timestamp}</p>
            </div>
        </div>
        ${incompleteBlock}
        <h3 style="font-size: 16px; color: #0f172a; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; width: fit-content;">Audited Page Nodes Breakdown</h3>
        ${pagesListContent}
    </div>
</body>
</html>`;
  fs.writeFileSync(uniqueReportPath, individualHtml, 'utf8');

  let historyTableRows = '';
  for (const h of historyList) {
    historyTableRows += renderHistoryRowTemplate(h);
  }

  const masterDashboardHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Automation Run Matrix History Hub</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f8fafc; color: #1e293b; padding: 50px; margin: 0; }
        .wrapper { max-width: 1200px; margin: 0 auto; }
        h1 { margin: 0 0 8px 0; color: #0f172a; font-size: 26px; font-weight: 800; }
        table { width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        th { background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 16px; text-align: left; border-bottom: 2px solid #e2e8f0; }
        td { padding: 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #475569; }
        .clickable-row { cursor: pointer; transition: background 0.15s; }
        .clickable-row:hover { background: #f8fafc; }
        tr:last-child td { border-bottom: none; }
    </style>
</head>
<body>
    <div class="wrapper">
        <h1>Site Auditor Engine History Hub</h1>
        <p style="color: #64748b; font-size: 15px; margin-top: 0; margin-bottom: 32px;">Domain-Isolated Dashboard Network tracking regression metrics for target host environment: <strong style="color: #0f172a;">${hostName}</strong></p>
        <table>
            <thead>
                <tr>
                    <th>Execution Date & Time</th>
                    <th>Target Destination Website</th>
                    <th>Pages Crawled</th>
                    <th>P1 Broken Links</th>
                    <th>A11y Violations (P2)</th>
                    <!-- 🔥 NEW COLUMN: Tracking programmatic Lighthouse metrics scores history -->
                    <th>Technical SEO Metrics</th>
                </tr>
            </thead>
            <tbody>
                ${historyTableRows}
            </tbody>
        </table>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const rows = document.querySelectorAll('.clickable-row');
            rows.forEach(function(row) {
                row.addEventListener('click', function() {
                    const destination = this.getAttribute('data-href');
                    if (destination) { window.location.href = destination; }
                });
            });
        });
    </script>
</body>
</html>`;
  fs.writeFileSync(indexDashboardPath, masterDashboardHtml, 'utf8');

  console.log(`\n📊 Launching Visualized Accordion Dashboard View: ${indexDashboardPath}`);
  const command = process.platform === 'win32' ? `start ""` : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${command} "${indexDashboardPath}"`);
}
