export interface A11yErrorDetail {
  id: string;
  impact: string;
  description: string;
  help: string;
  targetSelector: string;
  htmlSnippet: string;
  elementText: string;
  elementScreenshotPath?: string; // Links to the specific cropped element snapshot
}

export interface PageAuditResult {
  url: string;
  status: number;
  a11yErrors: number;
  seoScore: number;
  screenshotPath?: string; // Full-page screenshot link
  a11yDetails: A11yErrorDetail[];
  seoDetails: string[];
}

export interface RunHistoryRecord {
  runId: string;
  timestamp: string;
  targetUrl: string;
  totalScanned: number;
  brokenCount: number;
  a11yViolations: number;
  avgSeoScore: number; // Added tracking metric property
  reportFilename: string;
}

export interface DetailedReportData {
  runId: string;
  targetUrl: string;
  timestamp: string;
  brokenCount: number;
  a11yViolationCount: number;
  pages: PageAuditResult[];
  incompletePages: string[];
}

export interface CrawlEngineResult {
  url: string;
  statusCode: number;
  isBroken: boolean;
  screenshotPath?: string;
}
