export interface A11yErrorDetail {
  id: string;
  impact: string;
  description: string;
  help: string;
  targetSelector: string;
  htmlSnippet: string;
  elementText: string;
  elementScreenshotPath?: string;
}

export interface PageAuditResult {
  url: string;
  status: number;
  a11yErrors: number;
  seoScore: number;
  screenshotPath?: string;
  a11yDetails: A11yErrorDetail[];
  seoDetails: string[];
  // Tracks explicit successful checkpoints from the Lighthouse engine run
  seoPassDetails: string[]; 
}

export interface RunHistoryRecord {
  runId: string;
  timestamp: string;
  targetUrl: string;
  totalScanned: number;
  brokenCount: number;
  a11yViolations: number;
  avgSeoScore: number;
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

export type DeviceFormFactor = 'desktop' | 'tablet' | 'mobile';

export interface DetailedReportData {
  runId: string;
  targetUrl: string;
  timestamp: string;
  brokenCount: number;
  a11yViolationCount: number;
  pages: PageAuditResult[];
  incompletePages: string[];
  deviceMode?: DeviceFormFactor; // Track active mode inside history structures
}

export interface WizardAnswers {
  finalUrl: string;
  runA11y: boolean;
  runSeo: boolean;
  isHeadless: boolean;
  chosenDevice: 'desktop' | 'tablet' | 'mobile';
  pageCap: number; // Added page cap value signature
}
