import core from 'playwright-core';
import chromium from '@sparticuz/chromium';

interface AutomationParams {
  cookie: string;
  section: string;
  log: (message: string) => void;
}

const SELECTORS = {
  recommendedJobsUrl: 'https://www.naukri.com/mnjuser/recommendedjobs',
  jobArticle: 'article.jobTuple',
  jobCheckbox: 'div.tuple-check-box',
  applyButton: 'button.multi-apply-button',
  successToast: 'span.apply-message',
  sidebarForm: 'div.chatbot_Drawer'
};

export async function runNaukriAutomation({ cookie, section, log }: AutomationParams) {
  let browser: core.Browser | null = null;
  let page: core.Page | null = null;
  try {
    log('Preparing browser...');
    
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
        log('Running in production mode, using serverless chromium...');
        // In production, we use playwright-core and provide the browser from @sparticuz/chromium
        browser = await core.chromium.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            // FIX #1: Suppress the known type error for the 'headless' property
            // @ts-expect-error
            headless: chromium.headless,
        });
    } else {
        log('Running in development mode, using local chromium...');
        // In development, we use the full playwright package to find the local browser
        const playwright = await import('playwright');
        browser = await playwright.chromium.launch({
            headless: false,
        });
    }

    // FIX #2: Add a check to ensure the browser launched successfully, which resolves the "'browser' is possibly 'null'" error.
    if (!browser) {
      throw new Error("Browser instance could not be launched.");
    }

    const context = await browser.newContext();
    page = await context.newPage();

    log('Setting session cookie...');
    await context.addCookies([
      { name: 'nauk_at', value: cookie, domain: '.naukri.com', path: '/' },
    ]);

    log(`Navigating to Recommended Jobs page...`);
    await page.goto(SELECTORS.recommendedJobsUrl);
    
    log('Waiting for initial job listings to load...');
    await page.waitForSelector(SELECTORS.jobArticle, { timeout: 15000 });

    log(`Selecting '${section}' tab...`);
    await page.locator(`text=${section}`).first().click();

    log('Waiting for jobs to reload after tab switch...');
    await page.waitForTimeout(3000); 

    log('Finding job listings...');
    const jobArticles = await page.locator(SELECTORS.jobArticle).all();
    if (jobArticles.length === 0) {
      throw new Error('No job articles found after tab switch.');
    }

    const jobsToSelect = jobArticles.slice(0, 5);
    log(`Found ${jobArticles.length} jobs. Attempting to select the first ${jobsToSelect.length}...`);

    for (let i = 0; i < jobsToSelect.length; i++) {
      const job = jobsToSelect[i];
      log(`   - Selecting checkbox for job #${i + 1}...`);
      const checkbox = job.locator(SELECTORS.jobCheckbox);
      if (await checkbox.isVisible()) {
        await checkbox.click();
        await page.waitForTimeout(250);
      } else {
        log(`   - WARN: Checkbox for job #${i + 1} was not visible.`);
      }
    }

    log('Clicking the main "Apply" button...');
    const applyButton = page.locator(SELECTORS.applyButton);
    if (!await applyButton.isVisible({ timeout: 5000 })) {
      throw new Error('"Apply" button did not appear after selecting jobs.');
    }
    await applyButton.click();
    
    log('Waiting for application result...');
    
    const successLocator = page.locator(SELECTORS.successToast);
    const sidebarLocator = page.locator(SELECTORS.sidebarForm);

    const result = await Promise.race([
      successLocator.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'success'),
      sidebarLocator.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'sidebar'),
    ]).catch(() => {
        throw new Error("Timed out waiting for a success message or the questions sidebar.");
    });

    if (result === 'success') {
      const successText = await successLocator.innerText();
      log(`SUCCESS: ${successText}`);
    } else if (result === 'sidebar') {
      log('SKIPPED: Sidebar with custom questions appeared.');
    }

  } catch (error: any) {
    log(`ERROR: ${error.message}`);
    if (page) {
      log('Taking screenshot of the error page...');
      await page.screenshot({ path: 'error-screenshot.png' });
      log('Screenshot saved as error-screenshot.png');
    }
    throw error;
  } finally {
    if (browser) {
      log('Closing browser...');
      await browser.close();
    }
  }
}