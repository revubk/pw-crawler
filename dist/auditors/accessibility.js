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
exports.runAccessibilityAudit = runAccessibilityAudit;
const playwright_1 = require("@axe-core/playwright");
const path = __importStar(require("path"));
async function runAccessibilityAudit(page, url, runId, pageIndex) {
    try {
        const results = await new playwright_1.AxeBuilder({ page }).analyze();
        const enrichedViolations = [];
        const hostName = new URL(url).hostname.replace(/[^a-z0-9]/gi, '_');
        let violationIndex = 0;
        for (const violation of results.violations) {
            for (const node of violation.nodes) {
                violationIndex++;
                const selector = node.target.join(' > ');
                let htmlSnippet = 'N/A';
                let elementText = 'N/A';
                let elementScreenshotPath = undefined;
                try {
                    const elementLocator = page.locator(selector).first();
                    if (await elementLocator.count() > 0) {
                        htmlSnippet = await elementLocator.evaluate(el => el.outerHTML);
                        elementText = await elementLocator.innerText();
                        if (!elementText || elementText.trim().length === 0) {
                            elementText = await elementLocator.getAttribute('aria-label') || 'Empty Label';
                        }
                        // 📸 PLAYWRIGHT NATIVE ELEMENT HIGH-LIGHTING AND CROPPING
                        // Scroll the element into view safely before capturing
                        await elementLocator.scrollIntoViewIfNeeded();
                        // Inject a bold outline style border directly into the browser runtime layout
                        await elementLocator.evaluate((el) => {
                            el.style.outline = '3px solid #dc2626';
                            el.style.outlineOffset = '3px';
                        });
                        // Define folder paths and write the cropped image file to disk
                        const imgFilename = `screenshots/element_${runId}_p${pageIndex}_v${violationIndex}.png`;
                        const fullTargetImgPath = path.join(process.cwd(), 'reports', hostName, imgFilename);
                        await elementLocator.screenshot({ path: fullTargetImgPath });
                        elementScreenshotPath = imgFilename;
                        // Remove the temporary validation highlight style outline cleanly
                        await elementLocator.evaluate((el) => {
                            el.style.outline = '';
                            el.style.outlineOffset = '';
                        });
                    }
                }
                catch (_) {
                    htmlSnippet = node.html || 'Context missing';
                }
                enrichedViolations.push({
                    id: violation.id,
                    impact: violation.impact || 'serious',
                    description: violation.description,
                    help: violation.help,
                    targetSelector: selector,
                    htmlSnippet: htmlSnippet.substring(0, 300),
                    elementText: elementText.trim().substring(0, 100) || 'None',
                    elementScreenshotPath
                });
            }
        }
        return {
            url,
            violationCount: enrichedViolations.length,
            violations: enrichedViolations
        };
    }
    catch (error) {
        return { url, violationCount: 0, violations: [] };
    }
}
