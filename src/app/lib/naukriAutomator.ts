// sxurabh/naukri-automator/naukri-automator-2395bd3b0e42cdcc1775f3531cce259c26dbec88/src/app/lib/naukriAutomator.ts
import core from 'playwright-core';
import chromium from '@sparticuz/chromium';

interface AutomationParams {
  cookie: string;
  section: string;
  log: (message: string) => void;
  appliedJobIds: string[];
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

export async function runNaukriAutomation({ cookie, section, log, appliedJobIds: appliedJobIdsFromClient }: AutomationParams): Promise<string[]> {
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

    log('Waiting for jobs to load after tab switch...');
    await page.waitForTimeout(3000); 

    const previouslyAppliedIds = new Set<string>(appliedJobIdsFromClient);
    const sessionAppliedIds = new Set<string>();
    let totalAppliedCount = 0;
    const BATCH_SIZE = 5;

    while (true) {
        log('Scanning for new jobs to apply to...');
        const allJobArticles = await page.locator(SELECTORS.jobArticle).all();
        
        const candidateJobs: { jobElement: core.Locator; jobId: string }[] = [];
        for (const job of allJobArticles) {
            const jobId = await job.getAttribute('data-job-id');
            if (!jobId) continue;

            if (previouslyAppliedIds.has(jobId) || sessionAppliedIds.has(jobId)) {
                continue; 
            }

            const checkbox = job.locator(SELECTORS.jobCheckbox);
            // Short timeout here is fine, we just want to check for presence on already loaded items
            if (await checkbox.isVisible({ timeout: 500 })) { 
                candidateJobs.push({ jobElement: job, jobId });
            } else {
                log(`INFO: Job ${jobId} has no checkbox, marking as processed.`);
                previouslyAppliedIds.add(jobId);
            }
        }

        if (candidateJobs.length === 0) {
            log('No new apply-able jobs found on the page. Ending mission.');
            break;
        }
        
        log(`Found ${candidateJobs.length} new jobs. Preparing a batch of up to ${BATCH_SIZE}...`);

        const batchToProcess = candidateJobs.slice(0, BATCH_SIZE);
        const jobIdsInThisBatch: string[] = [];
        
        let selectedCountInBatch = 0;
        for (const { jobElement, jobId } of batchToProcess) {
            const checkbox = jobElement.locator(SELECTORS.jobCheckbox);
            await checkbox.click();
            jobIdsInThisBatch.push(jobId);
            selectedCountInBatch++;
            await page.waitForTimeout(250);
        }

        if (selectedCountInBatch === 0) {
            log("No selectable jobs found. This should not happen, ending automation.");
            break; 
        }

        log(`Selected ${selectedCountInBatch} jobs. Clicking the main "Apply" button...`);
        const applyButton = page.locator(SELECTORS.applyButton);
        if (!await applyButton.isVisible({ timeout: 5000 })) {
            log('WARN: "Apply" button did not appear. Aborting batch.');
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
            log("WARN: Timed out waiting for application confirmation.");
            return 'timeout'; 
        });

        if (result === 'success' || result === 'sidebar') {
            jobIdsInThisBatch.forEach(id => sessionAppliedIds.add(id));
            totalAppliedCount += jobIdsInThisBatch.length;
            if (result === 'success') {
                const successText = await successLocator.innerText();
                log(`SUCCESS: ${successText}`);
            } else {
                log('SKIPPED: Sidebar detected.');
            }
        } else {
            log('WARN: Batch application did not confirm. Aborting to prevent errors.');
            break;
        }

        // --- NAVIGATION FIX ---
        // Force navigate back to the recommended jobs page to reset the state.
        log('Resetting page state for next batch...');
        await page.goto(SELECTORS.recommendedJobsUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        
        log(`Re-selecting '${section}' tab...`);
        await page.locator(`text=${section}`).first().click();

        log('Waiting for jobs to render...');
        try {
            await page.waitForSelector(SELECTORS.jobArticle, { timeout: 15000 });
        } catch {
            log('Could not find job articles after reload. Ending mission.');
            break;
        }
    }

    log(`--- MISSION SUMMARY ---`);
    log(`Batch application complete.`);
    log(`Total jobs successfully applied to in this session: ${totalAppliedCount}`);
    
    return Array.from(sessionAppliedIds);

  } catch (error: any) {
    log(`ERROR: ${error.message}`);
    if (page) {
      try {
        log('Taking screenshot of the error page...');
        await page.screenshot({ path: '/tmp/error-screenshot.png' });
        log('Screenshot saved to /tmp/error-screenshot.png (not accessible in logs).');
      } catch (screenshotError: any) {
        log(`Could not take screenshot: ${screenshotError.message}`);
      }
    }
    throw error;
  } finally {
    if (browser) {
      log('Closing browser...');
      await browser.close();
    }
  }
}