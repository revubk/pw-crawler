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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const inquirer_1 = __importDefault(require("inquirer"));
const crawler_1 = require("./crawler/crawler");
const accessibility_1 = require("./auditors/accessibility");
const seo_1 = require("./auditors/seo");
const htmlReporter_1 = require("./reporter/htmlReporter");
dotenv.config();
async function executeSiteAudit(targetSite, scanA11y, scanSeo, headless) {
    const runId = Math.random().toString(36).substring(2, 7).toUpperCase();
    console.log(`\n🚀 Initializing Run [ID: ${runId}] for: ${targetSite}`);
    console.log(`🎛️ Active Modules: [Functional Basics: ALWAYS ON] | [Accessibility: ${scanA11y ? 'ON' : 'OFF'}] | [SEO: ${scanSeo ? 'ON' : 'OFF'}]`);
    const crawler = new crawler_1.WebCrawler(targetSite);
    const structuredPagesList = [];
    let aggregateA11yIssues = 0;
    const executionSummary = await crawler.startCrawl(headless, runId, async (page, url, statusCode) => {
        console.log(`🔎 Navigated & Loaded Page: ${url}`);
        let a11yErrorsOnPage = 0;
        let seoScoreOnPage = 100;
        // Handle broken links/crashes explicitly
        if (statusCode >= 400) {
            return { a11yErrors: 0, seoScore: 0 };
        }
        // 🔥 FIX: Run chosen metrics concurrently based on your toggle choice
        const tasks = [];
        if (scanA11y)
            tasks.push((0, accessibility_1.runAccessibilityAudit)(page, url));
        if (scanSeo)
            tasks.push((0, seo_1.runSeoAudit)(page, url));
        const auditResults = await Promise.all(tasks);
        let resultIndex = 0;
        if (scanA11y) {
            const a11yData = auditResults[resultIndex++];
            a11yErrorsOnPage = a11yData.violationCount;
            aggregateA11yIssues += a11yErrorsOnPage;
        }
        if (scanSeo) {
            const seoData = auditResults[resultIndex];
            seoScoreOnPage = seoData.score;
        }
        // Save page trace instantly
        structuredPagesList.push({
            url,
            status: statusCode,
            a11yErrors: a11yErrorsOnPage,
            seoScore: scanSeo ? seoScoreOnPage : 100
        });
        return { a11yErrors: a11yErrorsOnPage, seoScore: seoScoreOnPage };
    });
    // Map execution failure profiles and screenshots back to the dataset list
    executionSummary.forEach(crawledPage => {
        const activeMatch = structuredPagesList.find(p => p.url === crawledPage.url);
        if (!activeMatch) {
            // Handles page timeouts/failures that never reached the inner audit block
            structuredPagesList.push({
                url: crawledPage.url,
                status: crawledPage.statusCode,
                a11yErrors: 0,
                seoScore: 0,
                screenshotPath: crawledPage.screenshotPath
            });
        }
        else {
            activeMatch.screenshotPath = crawledPage.screenshotPath;
        }
    });
    const brokenCount = executionSummary.filter(r => r.isBroken).length;
    const finalVerdict = (brokenCount > 0 || aggregateA11yIssues > 5) ? 'NO-GO' : 'GO';
    const detailedPayload = {
        runId,
        targetUrl: targetSite,
        timestamp: new Date().toLocaleString(),
        verdict: finalVerdict,
        brokenCount,
        a11yViolationCount: aggregateA11yIssues,
        pages: structuredPagesList
    };
    (0, htmlReporter_1.generateHistoricReportsHub)(detailedPayload);
}
async function mainTerminalWizard() {
    console.log('==================================================');
    console.log('    Welcome to Kenvue QA Site Auditor Crawler     ');
    console.log('==================================================\n');
    const envUrl = process.env.TARGET_URL || 'https://example.com';
    const answers = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'urlSource',
            message: 'Select the target website environment source:',
            choices: [
                { name: `Use default from .env file (${envUrl})`, value: 'ENV' },
                { name: 'Type a custom website URL manually', value: 'MANUAL' }
            ]
        },
        {
            type: 'input',
            name: 'customUrl',
            message: 'Enter the full website URL:',
            when: (hash) => hash.urlSource === 'MANUAL',
            validate: (input) => {
                try {
                    new URL(input);
                    return true;
                }
                catch (_) {
                    return 'Please enter a valid absolute URL string.';
                }
            }
        },
        {
            type: 'list',
            name: 'browserMode',
            message: 'Choose browser visibility mode:',
            choices: [
                { name: 'Headless Mode (Fast, runs silently in background)', value: true },
                { name: 'Headed Mode (Opens visible Playwright UI browser window)', value: false }
            ]
        },
        {
            type: 'checkbox',
            name: 'auditTiers',
            message: 'Select the metrics you want to evaluate on this run:',
            choices: [
                { name: 'Functional Checks (P1 Broken Links/Crashes)', value: 'FUNC', disabled: 'Always Enabled' },
                { name: 'Accessibility Compliance (Axe-Core P2)', value: 'A11Y', checked: true },
                { name: 'Technical SEO Metadata Checklist (Lighthouse Core P2)', value: 'SEO', checked: true }
            ]
        }
    ]);
    const finalUrl = answers.urlSource === 'ENV' ? envUrl : answers.customUrl;
    const runA11y = answers.auditTiers.includes('A11Y');
    const runSeo = answers.auditTiers.includes('SEO');
    const isHeadless = answers.browserMode;
    await executeSiteAudit(finalUrl, runA11y, runSeo, isHeadless);
}
mainTerminalWizard().catch(err => console.error('Wizard failure:', err));
