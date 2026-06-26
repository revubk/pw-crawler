import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

export interface RunHistoryRecord {
  runId: string;
  timestamp: string;
  targetUrl: string;
  totalScanned: number;
  brokenCount: number;
  a11yViolations: number;
  verdict: 'GO' | 'NO-GO';
  reportFilename: string;
}

export interface DetailedReportData {
  runId: string;
  targetUrl: string;
  timestamp: string;
  verdict: 'GO' | 'NO-GO';
  brokenCount: number;
  a11yViolationCount: number;
  pages: Array<{
    url: string;
    status: number;
    a11yErrors: number;
    seoScore: number;
    screenshotPath?: string;
  }>;
}

export function generateHistoricReportsHub(currentRunData: DetailedReportData) {
  const reportsDir = path.join(process.cwd(), 'reports');
  const databasePath = path.join(reportsDir, 'history_database.json');
  const indexDashboardPath = path.join(reportsDir, 'index.html');
  const uniqueReportName = `report_${currentRunData.runId}.html`;
  const uniqueReportPath = path.join(reportsDir, uniqueReportName);

  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  // 1. Load historical database array tracker
  let historyList: RunHistoryRecord[] = [];
  if (fs.existsSync(databasePath)) {
    try {
      historyList = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
    } catch (_) { historyList = []; }
  }

  // Append new execution instance tracking metrics
  const newHistoryItem: RunHistoryRecord = {
    runId: currentRunData.runId,
    timestamp: currentRunData.timestamp,
    targetUrl: currentRunData.targetUrl,
    totalScanned: currentRunData.pages.length,
    brokenCount: currentRunData.brokenCount,
    a11yViolations: currentRunData.a11yViolationCount,
    verdict: currentRunData.verdict,
    reportFilename: uniqueReportName
  };
  historyList.unshift(newHistoryItem); // Show newest run at the top
  fs.writeFileSync(databasePath, JSON.stringify(historyList, null, 2), 'utf8');

  // 2. Generate the unique granular detail report file
  const individualHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Run Details - ${currentRunData.runId}</title>
    <style>
        body { font-family: sans-serif; background: #f4f6f9; padding: 30px; margin: 0; }
        .card { background: white; padding: 25px; border-radius: 8px; max-width: 1100px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 15px; }
        .badge { padding: 6px 12px; border-radius: 4px; font-weight: bold; }
        .badge-GO { background: #e6f6ec; color: #15803d; }
        .badge-NO-GO { background: #fdf2f2; color: #991b1b; }
        table { width: 100%; border-collapse: collapse; margin-top: 25px; }
        th, td { padding: 12px; border-bottom: 1px solid #eee; text-align: left; }
        th { background: #fafafa; }
        .btn-back { display: inline-block; margin-bottom: 20px; text-decoration: none; color: #2563eb; font-weight: bold; }
        .thumb-link { color: #dc2626; font-weight: bold; text-decoration: none; }
    </style>
</head>
<body>
    <div class="card">
        <a href="index.html" class="btn-back">← Back to Main Dashboard History</a>
        <div class="header">
            <div>
                <h2>Detailed Audit Report Run: ${currentRunData.runId}</h2>
                <p>Target Domain: <strong>${currentRunData.targetUrl}</strong> | Execution Time: ${currentRunData.timestamp}</p>
            </div>
            <span class="badge badge-${currentRunData.verdict}">Release Status: ${currentRunData.verdict}</span>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Target Page Path</th>
                    <th>HTTP Response</th>
                    <th>A11y Gaps (Axe)</th>
                    <th>SEO Rank</th>
                    <th>Failure Screenshot Evidence</th>
                </tr>
            </thead>
            <tbody>
                ${currentRunData.pages.map(p => `
                <tr>
                    <td>${p.url}</td>
                    <td><span style="color:${p.status >= 400 ? 'red' : 'green'}">${p.status}</span></td>
                    <td>${p.a11yErrors} errors</td>
                    <td><strong>${p.seoScore}/100</strong></td>
                    <td>
                        ${p.screenshotPath ? `<a href="${p.screenshotPath}" target="_blank" class="thumb-link">⚠️ View Screen Capture</a>` : '<span style="color:#666">None</span>'}
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;
  fs.writeFileSync(uniqueReportPath, individualHtml, 'utf8');

  // 3. Re-render Master Dashboard Index Tracking Engine
  const masterDashboardHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Kenvue QA Crawler Analytics Hub</title>
    <style>
        body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; margin: 0; }
        .wrapper { max-width: 1200px; margin: 0 auto; }
        h1 { margin: 0 0 10px 0; color: #38bdf8; }
        .sub { color: #94a3b8; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; }
        th, td { padding: 16px; text-align: left; border-bottom: 1px solid #334155; }
        th { background: #334155; color: #38bdf8; font-size: 13px; text-transform: uppercase; }
        tr:hover { background: #1e293b60; }
        .v-GO { color: #4ade80; font-weight: bold; }
        .v-NO-GO { color: #f87171; font-weight: bold; }
        .view-btn { background: #0284c7; color: white; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 13px; }
        .view-btn:hover { background: #0369a1; }
    </style>
</head>
<body>
    <div class="wrapper">
        <h1>Kenvue QA Site Auditor Crawler History Dashboard</h1>
        <p class="sub">Centralized tracking ledger dashboard displaying successive execution performance regressions over time.</p>
        <table>
            <thead>
                <tr>
                    <th>Execution Timestamp</th>
                    <th>Target Destination Website</th>
                    <th>Crawled Volume</th>
                    <th>P1 Broken Links</th>
                    <th>A11y Violations (P2)</th>
                    <th>Deployment Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${historyList.map(h => `
                <tr>
                    <td>${h.timestamp}</td>
                    <td><strong>${h.targetUrl}</strong></td>
                    <td>${h.totalScanned} pages</td>
                    <td style="color:${h.brokenCount > 0 ? '#f87171' : 'inherit'}">${h.brokenCount}</td>
                    <td style="color:${h.a11yViolations > 0 ? '#f87171' : 'inherit'}">${h.a11yViolations}</td>
                    <td><span class="v-${h.verdict}">${h.verdict}</span></td>
                    <td><a href="${h.reportFilename}" class="view-btn">Inspect Run Analysis</a></td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;
  fs.writeFileSync(indexDashboardPath, masterDashboardHtml, 'utf8');

  // 4. Automatically trigger launch sequence opening the screen right after task ending
  console.log(`\n📊 Launching Interactive Ledger History Hub at: ${indexDashboardPath}`);
  const command = process.platform === 'win32' ? `start ""` : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${command} "${indexDashboardPath}"`);
}
