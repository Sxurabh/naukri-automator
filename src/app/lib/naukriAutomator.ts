import playwright from 'playwright-core';
import chromium from '@sparticuz/chromium';

interface AutomationParams {
  cookie: string;
  section: string;
  log: (message: string) => void;
}

// Revised selectors based on your provided HTML
const SELECTORS = {
  recommendedJobsUrl: 'https://www.naukri.com/mnjuser/recommendedjobs',
  // The section tabs are likely still buttons with a title attribute, but confirm if this fails.
  jobSectionTab: (section: string) => `button[title="${section}"]`,
  // The article element for each job listing
  jobArticle: 'article.jobTuple',
  // The clickable icon for the checkbox within a job article
  jobCheckbox: 'i.naukicon-ot-checkbox',
  // The main apply button that appears after selections
  applyButton: 'button.multi-apply-button',
  // The container for the success message text
  successToast: 'span.apply-message',
  // The sidebar container for additional questions
  sidebarForm: 'div.chatbot_Drawer'
};

export async function runNaukriAutomation({ cookie, section, log }: AutomationParams) {
  let browser: playwright.Browser | null = null;
  try {
    log('Launching browser...');
    browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      // @ts-expect-error
      headless: chromium.headless,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    log('Setting session cookie...');
    await context.addCookies([
      {
        name: 'nauk_at',
        value: cookie,
        domain: '.naukri.com',
        path: '/',
      },
    ]);

    log(`Navigating to Recommended Jobs page...`);
    await page.goto(SELECTORS.recommendedJobsUrl, { waitUntil: 'domcontentloaded' });

    log(`Waiting for page to load and selecting '${section}' tab...`);
    // This might need a more robust waiter, but let's try this first.
    await page.waitForSelector(SELECTORS.jobArticle, { timeout: 10000 });
    
    // The tab switching logic might need adjustment if it's not a button with a title.
    // For now, we assume it is.
    // await page.click(SELECTORS.jobSectionTab(section));
    
    // An alternative way to click the tab by finding the text content
    await page.getByRole('button', { name: section, exact: true }).click();


    log('Waiting for jobs to reload after tab switch...');
    await page.waitForTimeout(3000); 

    log('Finding job listings...');
    const jobArticles = await page.locator(SELECTORS.jobArticle).all();
    if (jobArticles.length === 0) {
      throw new Error('No job articles found. The page might have changed or the selectors are incorrect.');
    }

    const jobsToSelect = jobArticles.slice(0, 5);
    
    log(`Found ${jobArticles.length} jobs. Selecting the first ${jobsToSelect.length}...`);

    for (const job of jobsToSelect) {
      const checkbox = job.locator(SELECTORS.jobCheckbox);
      if (await checkbox.isVisible()) {
        await checkbox.click();
        await page.waitForTimeout(250); // Small delay
      }
    }

    log('Clicking the main "Apply" button...');
    const applyButton = page.locator(SELECTORS.applyButton);
    if (!await applyButton.isVisible()) {
      throw new Error('"Apply" button not found. It may not have appeared after selecting jobs.');
    }
    await applyButton.click();
    
    log('Waiting for application result...');
    
    const successLocator = page.locator(SELECTORS.successToast);
    const sidebarLocator = page.locator(SELECTORS.sidebarForm);

    // Promise.race waits for the first locator to become visible
    const result = await Promise.race([
      successLocator.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'success'),
      sidebarLocator.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'sidebar'),
    ]).catch(() => {
        throw new Error("Timed out waiting for a success message or the questions sidebar. The application may have failed silently.");
    });


    if (result === 'success') {
      const successText = await successLocator.innerText();
      log(`SUCCESS: ${successText}`);
    } else if (result === 'sidebar') {
      log('SKIPPED: Sidebar with custom questions appeared.');
    }

  } catch (error: any) {
    log(`ERROR: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      log('Closing browser...');
      await browser.close();
    }
  }
}