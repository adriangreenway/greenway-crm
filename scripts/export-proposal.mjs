#!/usr/bin/env node

/**
 * Export a proposal page to a standalone static HTML file using Playwright.
 * Usage: node scripts/export-proposal.mjs <slug>
 * Output: proposal-export/index.html
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/export-proposal.mjs <slug>");
  process.exit(1);
}

const SOURCE_URL = `https://command.greenwayband.com/proposal/${slug}`;
const OUT_DIR = join(process.cwd(), "proposal-export");

async function main() {
  console.log(`Exporting proposal: ${SOURCE_URL}\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  await page.goto(SOURCE_URL, { waitUntil: "networkidle" });

  // Wait for the proposal content to render (the cover section with names)
  await page.waitForSelector('[style*="Bodoni Moda"]', { timeout: 15000 }).catch(() => {
    console.log("Warning: Could not find Bodoni Moda element, page may not have loaded fully");
  });

  // Wait a bit more for animations to settle
  await page.waitForTimeout(2000);

  // Force all reveal animations to their final visible state
  await page.evaluate(() => {
    document.querySelectorAll(".reveal").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  });

  // Extract all computed styles and inline them, then get the full HTML
  const html = await page.evaluate(() => {
    // Get all stylesheets content
    const styleSheets = [];
    for (const sheet of document.styleSheets) {
      try {
        const rules = [];
        for (const rule of sheet.cssRules) {
          rules.push(rule.cssText);
        }
        styleSheets.push(rules.join("\n"));
      } catch (e) {
        // Cross-origin stylesheet, skip
      }
    }

    // Get inline style tags
    const styleTags = [];
    document.querySelectorAll("style").forEach((el) => {
      styleTags.push(el.textContent);
    });

    // Get the full body HTML
    const bodyHTML = document.body.innerHTML;
    const title = document.title;

    return { styleSheets, styleTags, bodyHTML, title };
  });

  // Build standalone HTML
  const staticHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${html.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0A0A09; }
    /* Override reveal animations for static export */
    .reveal {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.8s ease, transform 0.8s ease;
    }
    .reveal.visible {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
    .reveal-delay-1 { transition-delay: 0.15s; }
    .reveal-delay-2 { transition-delay: 0.3s; }
    .reveal-delay-3 { transition-delay: 0.45s; }
  </style>
  ${html.styleSheets.map((css) => `<style>${css}</style>`).join("\n  ")}
  ${html.styleTags.map((css) => `<style>${css}</style>`).join("\n  ")}
</head>
<body>
  ${html.bodyHTML}
  <script>
    // Scroll-reveal observer for static export
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      observer.observe(el);
    });
  </script>
</body>
</html>`;

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, "index.html");
  writeFileSync(outPath, staticHTML, "utf-8");

  console.log(`Exported to: ${outPath}`);
  console.log(`File size: ${(Buffer.byteLength(staticHTML) / 1024).toFixed(1)} KB`);

  await browser.close();
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
