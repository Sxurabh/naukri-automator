import core from 'playwright-core';
import chromium from '@sparticuz/chromium';
import type { QuestionBankEntry, ScrapedQuestion } from './questionBank';
import { findBestMatch } from './questionBank';

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
  const delay = Math.random() * 2000 + 500;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Scrape all questionnaire fields from the Naukri sidebar/chatbot drawer
 */
async function scrapeQuestionnaire(page: core.Page, log: (msg: string) => void): Promise<ScrapedQuestion[]> {
  const questions: ScrapedQuestion[] = [];
  try {
    // Wait for the sidebar form content to fully render
    await page.waitForTimeout(2000);

    const sidebar = page.locator(SELECTORS.sidebarForm);

    // Scrape text inputs
    const textInputs = await sidebar.locator('input[type="text"], input:not([type])').all();
    for (const input of textInputs) {
      const label = await getClosestLabel(input, page);
      if (label) {
        questions.push({ text: label, inputType: 'text', options: null });
      }
    }

    // Scrape textareas as text
    const textareas = await sidebar.locator('textarea').all();
    for (const ta of textareas) {
      const label = await getClosestLabel(ta, page);
      if (label) {
        questions.push({ text: label, inputType: 'text', options: null });
      }
    }

    // Scrape dropdowns
    const selects = await sidebar.locator('select').all();
    for (const select of selects) {
      const label = await getClosestLabel(select, page);
      const options = await select.locator('option').allInnerTexts();
      const filteredOptions = options.filter(o => o.trim() && o !== 'Select' && o !== '--Select--');
      if (label) {
        questions.push({ text: label, inputType: 'dropdown', options: filteredOptions });
      }
    }

    // Scrape radio buttons (group by name)
    const radioGroups = new Map<string, string[]>();
    const radioLabels = new Map<string, string>();
    const radios = await sidebar.locator('input[type="radio"]').all();
    for (const radio of radios) {
      const name = await radio.getAttribute('name') || 'unknown';
      const radioLabel = await getClosestLabel(radio, page);
      if (radioLabel) {
        if (!radioGroups.has(name)) {
          radioGroups.set(name, []);
          // Try to find the group question text (usually a parent label or div)
          const groupLabel = await getGroupLabel(radio, page);
          radioLabels.set(name, groupLabel || radioLabel);
        }
        radioGroups.get(name)!.push(radioLabel);
      }
    }
    for (const [name, options] of radioGroups) {
      questions.push({ text: radioLabels.get(name) || name, inputType: 'radio', options });
    }

    log(`QUESTIONNAIRE: Scraped ${questions.length} questions from sidebar`);
  } catch (e: any) {
    log(`WARN: Error scraping questionnaire: ${e.message}`);
  }
  return questions;
}

/**
 * Get the closest label text for a form element
 */
async function getClosestLabel(element: core.Locator, page: core.Page): Promise<string | null> {
  try {
    // Try aria-label first
    const ariaLabel = await element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    // Try id -> for label
    const id = await element.getAttribute('id');
    if (id) {
      const label = page.locator(`label[for="${id}"]`);
      if (await label.count() > 0) {
        return (await label.first().innerText()).trim();
      }
    }

    // Try placeholder
    const placeholder = await element.getAttribute('placeholder');
    if (placeholder) return placeholder.trim();

    // Try parent label
    const parentLabel = element.locator('xpath=ancestor::label');
    if (await parentLabel.count() > 0) {
      return (await parentLabel.first().innerText()).trim();
    }

    // Try preceding sibling or previous element text
    const prevSibling = element.locator('xpath=preceding-sibling::*[1]');
    if (await prevSibling.count() > 0) {
      const text = (await prevSibling.first().innerText()).trim();
      if (text.length > 3 && text.length < 200) return text;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get the group label for radio buttons (the question text before the radio group)
 */
async function getGroupLabel(radio: core.Locator, page: core.Page): Promise<string | null> {
  try {
    const parent = radio.locator('xpath=ancestor::div[contains(@class, "question") or contains(@class, "field") or contains(@class, "form-group")]');
    if (await parent.count() > 0) {
      const labels = await parent.first().locator('label, .question-text, span').all();
      for (const label of labels) {
        const text = (await label.innerText()).trim();
        if (text.length > 5 && text.length < 200) return text;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Auto-fill a questionnaire sidebar with answers from the question bank
 */
async function fillQuestionnaire(
  page: core.Page,
  questions: ScrapedQuestion[],
  bank: QuestionBankEntry[],
  log: (msg: string) => void
): Promise<boolean> {
  const sidebar = page.locator(SELECTORS.sidebarForm);
  let allFilled = true;

  for (const question of questions) {
    const match = findBestMatch(question.text, bank);
    if (!match || !match.entry.answer) {
      log(`  Q: "${question.text}" → NO MATCH (needs answer in Question Bank)`);
      allFilled = false;
      continue;
    }

    log(`  Q: "${question.text}" → MATCHED (score: ${match.score.toFixed(2)}) → "${match.entry.answer}"`);

    try {
      if (question.inputType === 'text') {
        // Find the matching input and fill it
        const inputs = await sidebar.locator('input[type="text"], input:not([type]), textarea').all();
        for (const input of inputs) {
          const label = await getClosestLabel(input, page);
          if (label && findBestMatch(label, [match.entry], 0.5)) {
            await input.fill(match.entry.answer);
            break;
          }
        }
      } else if (question.inputType === 'dropdown') {
        const selects = await sidebar.locator('select').all();
        for (const select of selects) {
          const label = await getClosestLabel(select, page);
          if (label && findBestMatch(label, [match.entry], 0.5)) {
            await select.selectOption({ label: match.entry.answer });
            break;
          }
        }
      } else if (question.inputType === 'radio') {
        // Click the radio option that matches the answer
        const radioLabel = sidebar.locator(`label:has-text("${match.entry.answer}")`);
        if (await radioLabel.count() > 0) {
          await radioLabel.first().click();
        }
      }
    } catch (e: any) {
      log(`  WARN: Failed to fill "${question.text}": ${e.message}`);
      allFilled = false;
    }
  }

  return allFilled;
}

export async function runNaukriAutomation({ cookie, section, log, appliedJobIds: appliedJobIdsFromClient, settings, questionBank }: AutomationParams): Promise<string[]> {
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
        if (result === 'success') {
          jobIdsInThisBatch.forEach(id => sessionAppliedIds.add(id));
          totalAppliedCount += jobIdsInThisBatch.length;
          const successText = await successLocator.innerText();
          log(`SUCCESS: ${successText}`);
        } else {
          // Sidebar detected — scrape and try to auto-fill
          log('QUESTIONNAIRE: Sidebar detected. Scraping questions...');
          const scrapedQuestions = await scrapeQuestionnaire(page, log);

          const bank = questionBank || [];
          const autoFillOn = settings.autoFillEnabled && bank.length > 0;

          if (scrapedQuestions.length > 0 && autoFillOn) {
            // Try to match and fill all questions
            log('QUESTIONNAIRE: Attempting auto-fill...');
            const allFilled = await fillQuestionnaire(page, scrapedQuestions, bank, log);

            if (allFilled) {
              // Try to submit the sidebar form
              log('QUESTIONNAIRE: All questions filled. Submitting...');
              const submitBtn = page.locator(`${SELECTORS.sidebarForm} button[type="submit"], ${SELECTORS.sidebarForm} button:has-text("Apply"), ${SELECTORS.sidebarForm} button:has-text("Submit")`);
              if (await submitBtn.count() > 0) {
                await submitBtn.first().click();
                await page.waitForTimeout(2000);
                jobIdsInThisBatch.forEach(id => sessionAppliedIds.add(id));
                totalAppliedCount += jobIdsInThisBatch.length;
                log('QUESTIONNAIRE: Successfully submitted with auto-fill!');
              } else {
                log('QUESTIONNAIRE: Could not find submit button. Closing sidebar.');
              }
            } else {
              log('QUESTIONNAIRE: Some questions could not be matched. Skipping this job.');
            }
          } else if (scrapedQuestions.length > 0) {
            log(`QUESTIONNAIRE: Auto-fill ${autoFillOn ? 'could not match' : 'is disabled'}. Scraping ${scrapedQuestions.length} questions for learning.`);
          }

          // Stream scraped questions back to frontend for bank learning
          if (scrapedQuestions.length > 0) {
            log(`SCRAPED_QUESTIONS:${JSON.stringify(scrapedQuestions)}`);
          }

          // Close the sidebar
          const closeIcon = page.locator(SELECTORS.sidebarCloseIcon);
          if (await closeIcon.isVisible()) {
            await closeIcon.click();
            await page.waitForTimeout(500);
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