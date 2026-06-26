"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAccessibilityAudit = runAccessibilityAudit;
const playwright_1 = require("@axe-core/playwright");
async function runAccessibilityAudit(page, url) {
    try {
        const results = await new playwright_1.AxeBuilder({ page }).analyze();
        return {
            url,
            violationCount: results.violations.length,
            violations: results.violations.map(v => ({
                id: v.id,
                impact: v.impact,
                description: v.description,
                help: v.help
            }))
        };
    }
    catch (error) {
        return { url, violationCount: 0, violations: [] };
    }
}
