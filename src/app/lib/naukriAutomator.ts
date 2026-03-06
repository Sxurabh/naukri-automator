import core from 'playwright-core';
import chromium from '@sparticuz/chromium';
import type { QuestionBankEntry } from './questionBank';
import { CHATBOT_SELECTORS, scrapeQuestionnaire, fillQuestionnaire } from './chatbotHandler';

// Define AppSettings here to avoid importing from React components (page.tsx)
export interface AppSettings {
  jobsPerMission: number;
  stealthMode: boolean;
  autoFillEnabled?: boolean;
}

interface AutomationParams {
  cookie: string;
  section: string;
  log: (message: string) => void;
  appliedJobIds: string[];
  settings: AppSettings;
  questionBank?: QuestionBankEntry[];
  checkAbort?: () => boolean;
  getLatestQuestionBank?: () => Promise<QuestionBankEntry[]>;
}

const SELECTORS = {
  recommendedJobsUrl: 'https://www.naukri.com/mnjuser/recommendedjobs',
  jobArticle: 'article.jobTuple',
  jobCheckbox: 'div.tuple-check-box',
  applyButton: 'button.multi-apply-button',
  successToast: 'span.apply-message',
  sidebarForm: CHATBOT_SELECTORS.sidebarForm,
  sidebarCloseIcon: CHATBOT_SELECTORS.sidebarCloseIcon,
  errorToast: 'text="There was some error processing your request"',
};

// Helper for stealth mode delays
const randomDelay = (settings: AppSettings, min = 500, max = 2500) => {
  if (!settings.stealthMode) return Promise.resolve();
  const delay = Math.random() * (max - min) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

export async function runNaukriAutomation({ cookie, section, log, appliedJobIds: appliedJobIdsFromClient, settings, questionBank, checkAbort, getLatestQuestionBank }: AutomationParams): Promise<string[]> {
  let browser: core.Browser | null = null;
  let page: core.Page | null = null;
  try {
    log('Preparing browser...');
    log(`STEALTH MODE: ${settings.stealthMode ? 'ENABLED' : 'DISABLED'} `);
    log(`JOBS PER MISSION: ${settings.jobsPerMission} `);

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
      log(`Launching in Dev / CLI Mode(Standard Playwright).Headless: ${explicitHeadless} `);
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
      log(`WARN: Tab '${section}' not found exactly.Trying partial match...`);
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
      if (checkAbort && checkAbort()) {
        log('MISSION ABORTED BY USER.');
        break;
      }

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
      const currentBatchSize = Math.min(candidateJobs.length, MAX_BATCH_SIZE, remainingToApply);
      // Recommendation 8: Progress logging
      log(`[BATCH START] Selecting ${currentBatchSize} jobs(${totalAppliedCount} / ${settings.jobsPerMission} applied so far)...`);

      const batchToProcess = candidateJobs.slice(0, currentBatchSize);
      const jobIdsInThisBatch: string[] = [];

      // Recommendation 7: Parallel selection
      // Instead of awaiting each click sequentially, we use Promise.all to click them concurrently
      // with a slight stagger implemented inside the map if stealth mode is on.
      let selectedCountInBatch = 0;

      const selectionPromises = batchToProcess.map(async ({ jobElement, jobId }, index) => {
        if (checkAbort && checkAbort()) return;
        // Stagger the clicks slightly, then click
        await randomDelay(settings, index * 200, (index + 1) * 400);

        try {
          const checkbox = jobElement.locator(SELECTORS.jobCheckbox);
          await checkbox.click({ timeout: 5000 });
          jobIdsInThisBatch.push(jobId);
          selectedCountInBatch++;
        } catch (e) {
          // Log but continue if one checkbox fails
          log(`[WARN] Failed to click checkbox for job ${jobId}`);
        }
      });

      await Promise.all(selectionPromises);

      if (checkAbort && checkAbort()) {
        log('MISSION ABORTED BY USER.');
        break;
      }

      if (selectedCountInBatch === 0) {
        log("No selectable jobs found in this batch. Ending automation.");
        break;
      }

      log(`Selected ${selectedCountInBatch} jobs.Pausing briefly before applying...`);
      await page.waitForTimeout(1000);

      // Recommendation 9: Retry logic for apply
      const MAX_APPLY_RETRIES = 2;
      let appliedSuccessfully = false;

      for (let attempt = 1; attempt <= MAX_APPLY_RETRIES; attempt++) {
        log(`Clicking the main "Apply" button(Attempt ${attempt} / ${MAX_APPLY_RETRIES})...`);
        const applyButton = page.locator(SELECTORS.applyButton);
        if (!await applyButton.isVisible({ timeout: 5000 })) {
          log('WARN: "Apply" button did not appear. Aborting batch.');
          break; // Break the retry loop
        }
        await applyButton.click();

        log('Waiting for application result...');
        const successLocator = page.locator(SELECTORS.successToast);
        const sidebarLocator = page.locator(SELECTORS.sidebarForm);
        const errorLocator = page.locator(SELECTORS.errorToast);

        const result = await Promise.race([
          successLocator.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'success'),
          sidebarLocator.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'sidebar'),
          errorLocator.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'error'),
        ]).catch(() => 'timeout');

        if (result === 'success' || result === 'sidebar') {
          appliedSuccessfully = true;

          if (result === 'success') {
            jobIdsInThisBatch.forEach(id => sessionAppliedIds.add(id));
            totalAppliedCount += jobIdsInThisBatch.length;
            const successText = await successLocator.innerText();
            log(`SUCCESS: ${successText} [${totalAppliedCount} / ${settings.jobsPerMission}]`);
          } else {
            // Sidebar detected — scrape and try to auto-fill
            log('QUESTIONNAIRE: Sidebar detected. Scraping questions...');
            const scrapedQuestions = await scrapeQuestionnaire(page, log);

            // Get the most up-to-date question bank if the callback is provided
            let bank = questionBank || [];
            if (getLatestQuestionBank) {
              try {
                const freshBank = await getLatestQuestionBank();
                if (freshBank && freshBank.length > 0) {
                  bank = freshBank;
                  log(`QUESTIONNAIRE: Synced latest bank with ${bank.length} entries.`);
                }
              } catch (e) {
                log('WARN: Could not fetch latest question bank. Using initial bank.');
              }
            }

            const autoFillOn = settings.autoFillEnabled && bank.length > 0;

            if (scrapedQuestions.length > 0 && autoFillOn) {
              // Try to match and fill all questions
              log('QUESTIONNAIRE: Attempting auto-fill...');
              const fillResult = await fillQuestionnaire(page, scrapedQuestions, bank, log, checkAbort);

              if (fillResult.allFilled) {
                // Try to submit the sidebar form
                log('QUESTIONNAIRE: All questions filled. Submitting...');
                const submitBtn = page.locator(`${SELECTORS.sidebarForm} button[type="submit"], ${SELECTORS.sidebarForm} button:has-text("Apply"), ${SELECTORS.sidebarForm} button:has-text("Submit")`);
                if (await submitBtn.count() > 0) {
                  await submitBtn.first().click();
                  await page.waitForTimeout(2000);
                  jobIdsInThisBatch.forEach(id => sessionAppliedIds.add(id));
                  totalAppliedCount += jobIdsInThisBatch.length;
                  log(`QUESTIONNAIRE: Successfully submitted with auto - fill![${totalAppliedCount}/${settings.jobsPerMission}]`);

                  // Emit verified answers if any
                  if (fillResult.verifiedAnswers.length > 0) {
                    log(`VERIFIED_ANSWERS:${JSON.stringify(fillResult.verifiedAnswers)} `);
                  }
                } else {
                  log('QUESTIONNAIRE: Could not find submit button. Closing sidebar.');
                }
              } else {
                log('QUESTIONNAIRE: Some questions could not be matched. Skipping this job.');
              }
            } else if (scrapedQuestions.length > 0) {
              log(`QUESTIONNAIRE: Auto - fill ${autoFillOn ? 'could not match' : 'is disabled'}. Scraping ${scrapedQuestions.length} questions for learning.`);
            }

            // Stream scraped questions back to frontend for bank learning
            if (scrapedQuestions.length > 0) {
              log(`SCRAPED_QUESTIONS:${JSON.stringify(scrapedQuestions)} `);
            }

            // Close the sidebar
            const closeIcon = page.locator(SELECTORS.sidebarCloseIcon);
            if (await closeIcon.isVisible()) {
              await closeIcon.click();
              await page.waitForTimeout(500);
            }
          }
          break; // Break the apply retry loop on success/sidebar
        } else if (result === 'error') {
          log('ERROR: Naukri reported an error while processing the application.');
          if (attempt === MAX_APPLY_RETRIES) log('Giving up on this batch.');
          // Naukri errors might mean we hit a limit or bug, we'll continue the retry loop
        } else { // timeout
          log(`WARN: Batch application did not confirm(Timeout).`);
          if (attempt === MAX_APPLY_RETRIES) log('WARN: Max retries reached. Moving on.');
        }
      } // end retry loop

      if (!appliedSuccessfully) {
        log('WARN: Failed to confirm application for this batch. Refresing to find fresh jobs.');
      }

      if (totalAppliedCount >= settings.jobsPerMission) {
        log(`Target of ${settings.jobsPerMission} jobs reached.Mission accomplished.`);
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

    log(`-- - MISSION SUMMARY-- - `);
    log(`Batch application complete.`);
    log(`Total jobs successfully applied to in this session: ${totalAppliedCount} `);

    return Array.from(sessionAppliedIds);

  } catch (error: any) {
    log(`ERROR: ${error.message} `);
    if (page) {
      try {
        // Screenshot logic for debugging (saved to ephemeral storage)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `/ tmp / error - ${timestamp}.png`;
        await page.screenshot({ path: screenshotPath });
        log(`Screenshot saved to ${screenshotPath} (check artifacts if available).`);
      } catch (screenshotError: any) {
        log(`Could not take screenshot: ${screenshotError.message} `);
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