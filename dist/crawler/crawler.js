"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebCrawler = void 0;
const playwright_1 = require("playwright");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class WebCrawler {
    visitedUrls = new Set();
    queue = [];
    baseUrl;
    browser = null;
    isForceStopped = false;
    constructor(startUrl) {
        this.baseUrl = new URL(startUrl).origin;
        this.queue.push(startUrl);
        const hostName = new URL(startUrl).hostname.replace(/[^a-z0-9]/gi, '_');
        const screenshotDir = path.join(process.cwd(), 'reports', hostName, 'screenshots');
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }
    }
    stopGracefully() {
        this.isForceStopped = true;
    }
    async startCrawl(headless, runId, onPageDiscover) {
        let currentHeadlessMode = headless;
        const hostName = new URL(this.baseUrl).hostname.replace(/[^a-z0-9]/gi, '_');
        const results = [];
        // 🔥 PROGRAMMATIC LIGHTHOUSE HOOK: Exposing remote debugging port argument
        this.browser = await playwright_1.chromium.launch({
            headless: currentHeadlessMode,
            slowMo: currentHeadlessMode ? 0 : 300,
            args: ['--remote-debugging-port=9222']
        });
        let context = await this.browser.newContext({ viewport: { width: 1280, height: 720 } });
        while (this.queue.length > 0 && !this.isForceStopped) {
            if (!currentHeadlessMode && this.queue.length > 20) {
                console.log(`\n⚠️  NOTICE: Discovered pages > 20. Shifting browser execution to Headless...`);
                await this.browser.close();
                currentHeadlessMode = true;
                this.browser = await playwright_1.chromium.launch({
                    headless: true,
                    slowMo: 0,
                    args: ['--remote-debugging-port=9222']
                });
                context = await this.browser.newContext({ viewport: { width: 1280, height: 720 } });
            }
            const currentUrl = this.queue.shift();
            const cleanCurrentUrl = currentUrl.split('#')[0];
            if (this.visitedUrls.has(cleanCurrentUrl))
                continue;
            this.visitedUrls.add(cleanCurrentUrl);
            const currentProgressNumber = this.visitedUrls.size;
            const calculatedTotalVolume = this.visitedUrls.size + this.queue.length;
            const page = await context.newPage();
            try {
                const response = await page.goto(cleanCurrentUrl, { waitUntil: 'networkidle', timeout: 45000 });
                await page.waitForLoadState('load');
                await page.waitForTimeout(500);
                const status = response ? response.status() : 500;
                const isBroken = status >= 400;
                const auditMetrics = await onPageDiscover(page, cleanCurrentUrl, status, currentProgressNumber, calculatedTotalVolume);
                let screenshotFilename = undefined;
                if (isBroken || auditMetrics.a11yErrors > 0) {
                    const fileSafeName = cleanCurrentUrl.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
                    screenshotFilename = `screenshots/fail_${runId}_${fileSafeName}.png`;
                    const fullPath = path.join(process.cwd(), 'reports', hostName, screenshotFilename);
                    await page.screenshot({ path: fullPath, fullPage: true });
                }
                results.push({ url: cleanCurrentUrl, statusCode: status, isBroken, screenshotPath: screenshotFilename });
                if (!isBroken) {
                    const anchorLocators = page.locator('a[href]');
                    const count = await anchorLocators.count();
                    for (let i = 0; i < count; i++) {
                        const href = await anchorLocators.nth(i).getAttribute('href');
                        if (href) {
                            try {
                                const absoluteUrl = new URL(href, cleanCurrentUrl).href;
                                const cleanAbsoluteUrl = absoluteUrl.split('#')[0];
                                if (cleanAbsoluteUrl.startsWith(this.baseUrl) && !this.visitedUrls.has(cleanAbsoluteUrl) && !this.queue.includes(cleanAbsoluteUrl)) {
                                    this.queue.push(cleanAbsoluteUrl);
                                }
                            }
                            catch (_) { }
                        }
                    }
                }
            }
            catch (error) {
                const fileSafeName = cleanCurrentUrl.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
                const screenshotFilename = `screenshots/fail_${runId}_${fileSafeName}.png`;
                const fullPath = path.join(process.cwd(), 'reports', hostName, screenshotFilename);
                try {
                    await page.screenshot({ path: fullPath, fullPage: true });
                }
                catch (_) { }
                results.push({ url: cleanCurrentUrl, statusCode: 500, isBroken: true, screenshotPath: screenshotFilename });
            }
            finally {
                await page.close();
            }
        }
        await this.browser.close();
        return results;
    }
}
exports.WebCrawler = WebCrawler;
