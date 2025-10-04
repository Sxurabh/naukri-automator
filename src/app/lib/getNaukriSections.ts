// sxurabh/naukri-automator/naukri-automator-2395bd3b0e42cdcc1775f3531cce259c26dbec88/src/app/lib/getNaukriSections.ts
import core from 'playwright-core';
import chromium from '@sparticuz/chromium';

interface Section {
  name: string;
  count: number;
}

export async function getNaukriSections(cookie: string): Promise<Section[]> {
  let browser: core.Browser | null = null;
  let page: core.Page | null = null;
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
        browser = await core.chromium.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
        });
    } else {
        const playwright = await import('playwright');
        browser = await playwright.chromium.launch({
            headless: false,
        });
    }

    if (!browser) {
      throw new Error("Browser instance could not be launched.");
    }

    const context = await browser.newContext();
    page = await context.newPage();

    await context.addCookies([
      { name: 'nauk_at', value: cookie, domain: '.naukri.com', path: '/' },
    ]);

    await page.goto('https://www.naukri.com/mnjuser/recommendedjobs', { waitUntil: 'domcontentloaded', timeout: 40000 });

    const pageUrl = page.url();
    if (pageUrl.includes('/nlogin/login')) {
      throw new Error('Authentication failed. The provided cookie is likely invalid or expired.');
    }

    try {
      await page.waitForSelector('div.tab-list', { timeout: 20000 });
    } catch (e) {
      if (page) {
        await page.screenshot({ path: 'get-sections-error-screenshot.png' });
        console.log("Screenshot saved to get-sections-error-screenshot.png");
      }
      throw new Error('Failed to find job sections container. A screenshot was taken. Check for pop-ups or unexpected pages.');
    }
    
    const tabSelector = 'div.tab-list-item';
    const tabLocators = await page.locator(tabSelector).all();
    const sections: Section[] = [];

    for (const tabLocator of tabLocators) {
      const text = await tabLocator.innerText();
      const match = text.match(/^(.*)\s\((\d+)\)$/);
      if (match) {
        const name = match[1].trim();
        const count = parseInt(match[2], 10);
        // Removed the filter that was incorrectly skipping the "Applies" section
        sections.push({ name, count });
      }
    }
    
    if (sections.length === 0) {
      throw new Error('Could not find or parse any job sections on the page. The layout may have changed.');
    }

    return sections;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}