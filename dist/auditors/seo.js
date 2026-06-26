"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeoAudit = runSeoAudit;
async function runSeoAudit(page, url) {
    const metadata = await page.evaluate(() => {
        return {
            title: document.title,
            description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            h1: document.querySelector('h1')?.textContent || ''
        };
    });
    const hasTitle = metadata.title.trim().length > 0;
    const hasMetaDescription = metadata.description.trim().length > 0;
    const hasH1 = metadata.h1.trim().length > 0;
    // Simple scoring algorithm based on basic requirements
    let score = 0;
    if (hasTitle)
        score += 40;
    if (hasMetaDescription)
        score += 30;
    if (hasH1)
        score += 30;
    return { url, hasTitle, hasMetaDescription, hasH1, score };
}
