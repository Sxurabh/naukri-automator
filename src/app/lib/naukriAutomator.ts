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
        browser = await core.chromium.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
    } else {
        log('Running in development mode, using local chromium...');
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

    log('Setting session cookie...');
    await context.addCookies([
      { name: 'nauk_at', value: cookie, domain: '.naukri.com', path: '/' },
    ]);

    log(`Navigating to Recommended Jobs page...`);
    await page.goto(SELECTORS.recommendedJobsUrl);
    
    // Add enhanced logging to help debug authentication issues on Vercel
    log(`Current page URL: ${page.url()}`);
    log(`Current page title: "${await page.title()}"`);

    log('Waiting for initial job listings to load...');
    // Increased timeout to 30 seconds for serverless cold starts
    await page.waitForSelector(SELECTORS.jobArticle, { timeout: 30000 });

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
      // Save screenshot to the /tmp directory, which is writable on Vercel
      await page.screenshot({ path: '/tmp/error-screenshot.png' });
      log('Screenshot saved to /tmp/error-screenshot.png (not accessible in logs).');
    }
    throw error;
  } finally {
    if (browser) {
      log('Closing browser...');
      await browser.close();
    }
  }
}