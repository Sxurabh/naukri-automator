import core from 'playwright-core';
import chromium from '@sparticuz/chromium';

// Define AppSettings here to avoid importing from React components (page.tsx)
export interface AppSettings {
  jobsPerMission: number;
  stealthMode: boolean;
}

interface AutomationParams {
  cookie: string;
  section: string;
  log: (message: string) => void;
  appliedJobIds: string[];
  settings: AppSettings;
}

const SELECTORS = {
  recommendedJobsUrl: 'https://www.naukri.com/mnjuser/recommendedjobs',
  jobArticle: 'article.jobTuple',
  jobCheckbox: 'div.tuple-check-box',
  applyButton: 'button.multi-apply-button',
  successToast: 'span.apply-message',
  sidebarForm: 'div.chatbot_Drawer',
  sidebarCloseIcon: 'div.chatBot-ic-cross',
  errorToast: 'text="There was some error processing your request"',
};

// Helper for stealth mode delays
const randomDelay = (settings: AppSettings) => {
  if (!settings.stealthMode) return Promise.resolve();
  const delay = Math.random() * 2000 + 500; // Random delay between 0.5s and 2.5s
  return new Promise(resolve => setTimeout(resolve, delay));
}

export async function runNaukriAutomation({ cookie, section, log, appliedJobIds: appliedJobIdsFromClient, settings }: AutomationParams): Promise<string[]> {
  let browser: core.Browser | null = null;
  let page: core.Page | null = null;
  try {
    log('Preparing browser...');
    log(`STEALTH MODE: ${settings.stealthMode ? 'ENABLED' : 'DISABLED'}`);
    log(`JOBS PER MISSION: ${settings.jobsPerMission}`);

    const isDocker = process.env.DOCKER_MODE === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    // Check for explicit headless env var (string 'true') or default to false for local dev
    const explicitHeadless = process.env.HEADLESS_MODE === 'true';

    if (isDocker) {
      // Docker Environment: Use standard Playwright with system-installed Chromium
      log('Launching in Docker Mode (Playwright + System Chromium). Headless: true');
      const playwright = await import('playwright');
      browser = await playwright.chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
    } else if (isProduction) {
      // Vercel Environment (Serverless)
      log('Launching in Production Mode (Playwright Core + Chromium)...');
      browser = await core.chromium.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true, // Always headless in production
      });
    } else {
      // Local or GitHub Actions Environment
      log(`Launching in Dev/CLI Mode (Standard Playwright). Headless: ${explicitHeadless}`);
      // Dynamic import prevents Vercel build errors
      const playwright = await import('playwright');
      browser = await playwright.chromium.launch({
        headless: explicitHeadless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for some CI environments
      });
    }

    if (!browser) {
      throw new Error("Browser instance could not be launched.");
    }

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    page = await context.newPage();

    log('Setting session cookie...');
    await context.addCookies([
      { name: 'nauk_at', value: cookie, domain: '.naukri.com', path: '/' },
    ]);

    log(`Navigating to Naukri Recommended Jobs...`);
    await page.goto(SELECTORS.recommendedJobsUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });

    const pageUrl = page.url();
    if (pageUrl.includes('/nlogin/login')) {
      throw new Error('Authentication failed. The provided cookie is likely invalid or expired.');
    }

    try {
      await page.waitForSelector('div.tab-list-item', { timeout: 20000 });
    } catch (e) {
      throw new Error('Failed to load job sections. Please check your cookie and network connection.');
    }

    log(`Selecting '${section}' tab...`);
    // Improved selector to handle exact text matching more robustly
    const tabLocator = page.locator(`div.tab-list-item:has-text("${section}")`).first();
    if (await tabLocator.isVisible()) {
      await tabLocator.click();
    } else {
      log(`WARN: Tab '${section}' not found exactly. Trying partial match...`);
      await page.locator(`text=${section}`).first().click();
    }

    await randomDelay(settings);

    log('Waiting for jobs to load after tab switch...');
    await page.waitForTimeout(3000);

    const previouslyAppliedIds = new Set<string>(appliedJobIdsFromClient);
    const sessionAppliedIds = new Set<string>();
    let totalAppliedCount = 0;
    const BATCH_SIZE = settings.jobsPerMission;

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
        if (await checkbox.isVisible({ timeout: 500 })) {
          candidateJobs.push({ jobElement: job, jobId });
        } else {
          // If checkbox isn't visible, we assume it's already applied or not applicable
          previouslyAppliedIds.add(jobId);
        }
      }

      if (candidateJobs.length === 0) {
        log('No new apply-able jobs found on the page. Ending mission.');
        break;
      }

      const MAX_BATCH_SIZE = 5;
      const remainingToApply = settings.jobsPerMission - totalAppliedCount;
      const currentBatchSize = Math.min(MAX_BATCH_SIZE, remainingToApply);

      log(`Found ${candidateJobs.length} new jobs. Preparing a batch of up to ${currentBatchSize}...`);

      const batchToProcess = candidateJobs.slice(0, currentBatchSize);
      const jobIdsInThisBatch: string[] = [];

      let selectedCountInBatch = 0;
      for (const { jobElement, jobId } of batchToProcess) {
        const checkbox = jobElement.locator(SELECTORS.jobCheckbox);
        await checkbox.click();
        jobIdsInThisBatch.push(jobId);
        selectedCountInBatch++;
        await randomDelay(settings);
      }

      if (selectedCountInBatch === 0) {
        log("No selectable jobs found in this batch. Ending automation.");
        break;
      }

      log(`Selected ${selectedCountInBatch} jobs. Pausing briefly before applying...`);
      await page.waitForTimeout(1000);

      log(`Clicking the main "Apply" button...`);
      const applyButton = page.locator(SELECTORS.applyButton);
      if (!await applyButton.isVisible({ timeout: 5000 })) {
        log('WARN: "Apply" button did not appear. Aborting batch.');
        break;
      }
      await applyButton.click();

      log('Waiting for application result...');
      const successLocator = page.locator(SELECTORS.successToast);
      const sidebarLocator = page.locator(SELECTORS.sidebarForm);
      const errorLocator = page.locator(SELECTORS.errorToast);

      const result = await Promise.race([
        successLocator.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'success'),
        sidebarLocator.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'sidebar'),
        errorLocator.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'error'),
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
          log('SKIPPED: Sidebar detected (Chatbot/Questionnaire).');
          log(`INFO: Jobs in this batch marked as processed: ${jobIdsInThisBatch.join(', ')}`);
          // Optional: Attempt to close sidebar if it blocks the UI
          const closeIcon = page.locator(SELECTORS.sidebarCloseIcon);
          if (await closeIcon.isVisible()) {
            await closeIcon.click();
          }
        }
      } else if (result === 'error') {
        log('ERROR: Naukri reported an error while processing the application. Aborting mission.');
        break;
      } else { // timeout
        log('WARN: Batch application did not confirm. Aborting to prevent errors.');
        break;
      }

      if (totalAppliedCount >= settings.jobsPerMission) {
        log(`Target of ${settings.jobsPerMission} jobs reached. Mission accomplished.`);
        break;
      }

      log('Navigating back to Recommended Jobs to find the next batch...');
      await randomDelay(settings);
      await page.goto(SELECTORS.recommendedJobsUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });

      log(`Re-selecting '${section}' tab...`);
      const tabLocatorRetry = page.locator(`div.tab-list-item:has-text("${section}")`).first();
      if (await tabLocatorRetry.isVisible()) {
        await tabLocatorRetry.click();
      } else {
        await page.locator(`text=${section}`).first().click();
      }

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
        // Screenshot logic for debugging (saved to ephemeral storage)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `/tmp/error-${timestamp}.png`;
        await page.screenshot({ path: screenshotPath });
        log(`Screenshot saved to ${screenshotPath} (check artifacts if available).`);
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