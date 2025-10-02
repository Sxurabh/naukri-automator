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
  sidebarForm: 'div.chatbot_Drawer',
  sidebarCloseIcon: 'div.chatBot-ic-cross',
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
            headless: true,
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
    
    log(`Current page URL: ${page.url()}`);
    log(`Current page title: "${await page.title()}"`);

    log('Waiting for initial job listings to load...');
    await page.waitForSelector(SELECTORS.jobArticle, { timeout: 30000 });

    log(`Selecting '${section}' tab...`);
    await page.locator(`text=${section}`).first().click();

    log('Waiting for jobs to reload after tab switch...');
    await page.waitForTimeout(3000); 

    log('Starting batch application process...');
    let totalAppliedCount = 0;
    const BATCH_SIZE = 5;

    while (true) {
        log('Searching for available jobs for the next batch...');
        const availableJobs = await page.locator(SELECTORS.jobArticle).all();

        if (availableJobs.length === 0) {
            log('No more jobs found to apply to.');
            break;
        }

        const jobsInBatch = availableJobs.slice(0, BATCH_SIZE);
        log(`Found ${availableJobs.length} jobs. Processing a batch of ${jobsInBatch.length}...`);

        let selectedCountInBatch = 0;
        for (const job of jobsInBatch) {
            const checkbox = job.locator(SELECTORS.jobCheckbox);
            if (await checkbox.isVisible()) {
                await checkbox.click();
                selectedCountInBatch++;
                await page.waitForTimeout(250);
            }
        }

        if (selectedCountInBatch === 0) {
            log("No selectable jobs found in this batch. Ending automation.");
            break; 
        }
        
        log(`Selected ${selectedCountInBatch} jobs. Clicking the main "Apply" button...`);
        const applyButton = page.locator(SELECTORS.applyButton);
        if (!await applyButton.isVisible({ timeout: 5000 })) {
            log('WARN: "Apply" button did not appear. Assuming all jobs are processed.');
            break;
        }
        await applyButton.click();
        
        log('Waiting for application result...');
        
        const successLocator = page.locator(SELECTORS.successToast);
        const sidebarLocator = page.locator(SELECTORS.sidebarForm);

        const result = await Promise.race([
          successLocator.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'success'),
          sidebarLocator.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'sidebar'),
        ]).catch(() => {
            log("WARN: Timed out waiting for confirmation.");
            return 'timeout'; 
        });

        if (result === 'success') {
          const successText = await successLocator.innerText();
          log(`SUCCESS: ${successText}`);
          totalAppliedCount += selectedCountInBatch;
        } else if (result === 'sidebar') {
          log('SKIPPED: Sidebar detected. Eligible jobs in batch were applied. Closing to continue...');
          totalAppliedCount += selectedCountInBatch;
          const closeIcon = page.locator(SELECTORS.sidebarCloseIcon);
          if (await closeIcon.isVisible({ timeout: 3000 })) {
              await closeIcon.click();
              log('Sidebar close icon clicked.');
          } else {
              log('WARN: Could not find sidebar close icon. Pressing Escape as fallback.');
              await page.keyboard.press('Escape');
          }
        }

        // --- NEW REFRESH LOGIC ---
        log('Refreshing job list by re-selecting the tab...');
        // Click another tab (if available) and then click back to force a refresh
        const otherTab = await page.locator('div.tab').filter({ hasNotText: section }).first();
        if (await otherTab.isVisible()) {
            await otherTab.click();
            await page.waitForTimeout(1000); // Brief wait
        }
        await page.locator(`text=${section}`).first().click();
        
        try {
            await page.waitForSelector(SELECTORS.jobArticle, { timeout: 15000 });
            log('Job list refreshed. Continuing to the next batch.');
        } catch {
            log('No job articles found after refresh. Assuming mission is complete.');
            break;
        }
    }

    log(`--- MISSION SUMMARY ---`);
    log(`Batch application complete.`);
    log(`Total jobs successfully applied to in this session: ${totalAppliedCount}`);

  } catch (error: any) {
    log(`ERROR: ${error.message}`);
    if (page) {
      log('Taking screenshot of the error page...');
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