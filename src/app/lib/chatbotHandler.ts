import core from 'playwright-core';
import type { QuestionBankEntry, ScrapedQuestion } from './questionBank';
import { findBestMatch } from './questionBank';

// Chatbot-specific selectors
export const CHATBOT_SELECTORS = {
    sidebarForm: 'div.chatbot_Drawer',
    sidebarCloseIcon: 'div.chatBot-ic-cross',
    chatbotMessage: '.botMsg.msg',
    chatbotSentMessage: '.sendMsg',
    chatbotRadioButton: '.ssrc__radio-btn-container',
    chatbotCheckbox: '.mcc__checkbox',
    chatbotInputContainer: '.chatbot_InputContainer',
    // Save/Submit button inside the chatbot — Naukri uses div.sendMsg as the clickable "Save" element
    chatbotSaveButton: 'div.sendMsg',
};

/**
 * Get the latest bot question text from the chatbot sidebar.
 * The last `.botMsg.msg` element contains the current question.
 */
export async function getLatestBotQuestion(sidebar: core.Locator): Promise<string | null> {
    try {
        const botMessages = await sidebar.locator(CHATBOT_SELECTORS.chatbotMessage).all();
        if (botMessages.length === 0) return null;
        const lastMsg = botMessages[botMessages.length - 1];
        const text = (await lastMsg.innerText()).trim();
        return text.length > 0 ? text : null;
    } catch {
        return null;
    }
}

/**
 * Detect the current input type in the chatbot sidebar.
 * Returns 'radio' if radio buttons are visible, 'text' if the input container is visible.
 */
export async function detectChatbotInputType(sidebar: core.Locator): Promise<'radio' | 'text' | 'checkbox' | null> {
    try {
        const radioButtons = sidebar.locator(CHATBOT_SELECTORS.chatbotRadioButton);
        if (await radioButtons.count() > 0) return 'radio';

        const checkboxes = sidebar.locator(CHATBOT_SELECTORS.chatbotCheckbox);
        if (await checkboxes.count() > 0) return 'checkbox';

        const inputContainer = sidebar.locator(CHATBOT_SELECTORS.chatbotInputContainer);
        if (await inputContainer.count() > 0) return 'text';

        return null;
    } catch {
        return null;
    }
}

/**
 * Get all visible radio option labels from the chatbot sidebar.
 */
export async function getChatbotRadioOptions(sidebar: core.Locator): Promise<string[]> {
    try {
        const radioContainers = await sidebar.locator(CHATBOT_SELECTORS.chatbotRadioButton).all();
        const options: string[] = [];
        for (const container of radioContainers) {
            const labelElement = container.locator('.ssrc__label');
            if (await labelElement.count() > 0) {
                const text = (await labelElement.first().innerText()).trim();
                if (text.length > 0) options.push(text);
            }
        }
        return options;
    } catch {
        return [];
    }
}

/**
 * Get all visible checkbox option labels from the chatbot sidebar.
 */
export async function getChatbotCheckboxOptions(sidebar: core.Locator): Promise<string[]> {
    try {
        const checkboxContainers = await sidebar.locator('.multicheckboxes-container').all();
        const options: string[] = [];
        if (checkboxContainers.length > 0) {
            // Typically there's only one container at a time, but let's look at all just in case
            for (const container of checkboxContainers) {
                const labels = await container.locator('label.mcc__label').all();
                for (const label of labels) {
                    const text = (await label.innerText()).trim();
                    if (text.length > 0) options.push(text);
                }
            }
        }
        return options;
    } catch {
        return [];
    }
}

/**
 * Scrape the current visible question from the Naukri chatbot sidebar.
 * The chatbot shows one question at a time, so we read the latest bot message
 * and detect whether it expects a radio selection or text input.
 */
export async function scrapeQuestionnaire(page: core.Page, log: (msg: string) => void): Promise<ScrapedQuestion[]> {
    const questions: ScrapedQuestion[] = [];
    try {
        // Wait for the chatbot sidebar content to fully render
        await page.waitForTimeout(2000);

        const sidebar = page.locator(CHATBOT_SELECTORS.sidebarForm);

        // The chatbot is sequential — it shows one question at a time.
        // We scrape the current visible question.
        const questionText = await getLatestBotQuestion(sidebar);
        if (!questionText) {
            log('QUESTIONNAIRE: No bot message found in sidebar.');
            return questions;
        }

        const inputType = await detectChatbotInputType(sidebar);

        if (inputType === 'radio') {
            const options = await getChatbotRadioOptions(sidebar);
            questions.push({ text: questionText, inputType: 'radio', options });
            log(`QUESTIONNAIRE: Found radio question: "${questionText}" with ${options.length} options`);
        } else if (inputType === 'checkbox') {
            const options = await getChatbotCheckboxOptions(sidebar);
            questions.push({ text: questionText, inputType: 'checkbox', options });
            log(`QUESTIONNAIRE: Found checkbox question: "${questionText}" with ${options.length} options`);
        } else if (inputType === 'text') {
            questions.push({ text: questionText, inputType: 'text', options: null });
            log(`QUESTIONNAIRE: Found text question: "${questionText}"`);
        } else {
            // Still record the question even if we can't detect input type
            questions.push({ text: questionText, inputType: 'text', options: null });
            log(`QUESTIONNAIRE: Found question (unknown input type): "${questionText}"`);
        }

        log(`QUESTIONNAIRE: Scraped ${questions.length} questions from sidebar`);
    } catch (e: any) {
        log(`WARN: Error scraping questionnaire: ${e.message}`);
    }
    return questions;
}

/**
 * Try to find and click the Save/Submit/Send button inside the chatbot sidebar.
 * Uses multiple selector strategies to maximize reliability.
 * Returns true if a button was found and clicked.
 */
export async function clickChatbotSaveButton(
    sidebar: core.Locator,
    page: core.Page,
    log: (msg: string) => void
): Promise<boolean> {
    // Strategy 1: Click the Naukri chatbot's div.sendMsg "Save" button
    const saveDivBtn = sidebar.locator(CHATBOT_SELECTORS.chatbotSaveButton);
    if (await saveDivBtn.count() > 0) {
        await saveDivBtn.first().click();
        log(`  → Clicked Save button (div.sendMsg)`);
        return true;
    }

    // Strategy 2: Look for a div.send container and click the sendMsg inside it
    const sendContainer = sidebar.locator('div.send .sendMsg');
    if (await sendContainer.count() > 0) {
        await sendContainer.first().click();
        log(`  → Clicked Save button (div.send > .sendMsg)`);
        return true;
    }

    // Strategy 3: Fallback to any button with save/submit text
    const fallbackBtn = sidebar.locator('button:has-text("Save"), button:has-text("Submit"), button:has-text("Next"), button[type="submit"]');
    if (await fallbackBtn.count() > 0) {
        await fallbackBtn.first().click();
        log(`  → Clicked Save/Submit button (fallback)`);
        return true;
    }

    return false;
}

/**
 * Wait for the chatbot to show a new/different question after saving.
 * Compares against the previous question text to detect the transition.
 * Returns the new question text, or null if no new question appeared.
 */
export async function waitForNextQuestion(
    sidebar: core.Locator,
    previousQuestionText: string,
    log: (msg: string) => void,
    maxWaitMs: number = 5000
): Promise<string | null> {
    const pollInterval = 500;
    const maxAttempts = Math.ceil(maxWaitMs / pollInterval);

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        const currentQuestion = await getLatestBotQuestion(sidebar);

        if (!currentQuestion) {
            // No question visible — chatbot may have finished
            log(`  → No question visible after save (attempt ${i + 1}/${maxAttempts})`);
            continue;
        }

        if (currentQuestion !== previousQuestionText) {
            log(`  → New question detected: "${currentQuestion.substring(0, 60)}..."`);
            return currentQuestion;
        }
    }

    return null;
}

export interface FillResult {
    allFilled: boolean;
    verifiedAnswers: { text: string; answer: string }[];
}

/**
 * Auto-fill the chatbot questionnaire sidebar with answers from the question bank.
 * Follows the chatbot loop: read question → answer → click Save → wait for next question.
 * Handles multiple sequential questions until no more appear.
 */
export async function fillQuestionnaire(
    page: core.Page,
    questions: ScrapedQuestion[],
    bank: QuestionBankEntry[],
    log: (msg: string) => void,
    checkAbort?: () => boolean
): Promise<FillResult> {
    let allFilled = true;
    const verifiedAnswers: { text: string; answer: string }[] = [];
    const MAX_QUESTIONS = 20; // Safety limit to prevent infinite loops
    let questionCount = 0;
    let previousQuestionText: string | null = null;

    while (questionCount < MAX_QUESTIONS) {
        if (checkAbort && checkAbort()) {
            log('QUESTIONNAIRE: Mission aborted by user.');
            break;
        }

        // Recommendation 3: Re-fetch sidebar dynamically to avoid stale elements
        const sidebar = page.locator(CHATBOT_SELECTORS.sidebarForm);

        // Read the current question from the chatbot
        const questionText = await getLatestBotQuestion(sidebar);
        if (!questionText) {
            log('QUESTIONNAIRE: No more bot questions detected. Done.');
            break;
        }

        // If the question hasn't changed after our save, we might be stuck
        if (previousQuestionText && questionText === previousQuestionText) {
            log('QUESTIONNAIRE: Question did not change after save. May be done or stuck.');
            break;
        }

        questionCount++;
        log(`QUESTIONNAIRE: Processing question ${questionCount}: "${questionText}"`);

        const match = findBestMatch(questionText, bank);
        if (!match || !match.entry.answer) {
            log(`  Q: "${questionText}" → NO MATCH (needs answer in Question Bank)`);
            allFilled = false;
            // Recommendation 4: Screenshot on chatbot failure
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const screenshotPath = `/tmp/chatbot-nomatch-${timestamp}.png`;
                await page.screenshot({ path: screenshotPath });
                log(`  → Screenshot saved to ${screenshotPath}`);
            } catch (e: any) {
                log(`  → Could not take screenshot: ${e.message}`);
            }
            break; // Can't proceed in sequential chatbot without answering
        }

        log(`  Q: "${questionText}" → MATCHED (score: ${match.score.toFixed(2)}) → "${match.entry.answer}"`);

        try {
            const inputType = await detectChatbotInputType(sidebar);

            if (inputType === 'radio') {
                const radioContainers = await sidebar.locator(CHATBOT_SELECTORS.chatbotRadioButton).all();
                let clicked = false;
                for (const container of radioContainers) {
                    const labelElement = container.locator('.ssrc__label');
                    if (await labelElement.count() > 0) {
                        const btnText = (await labelElement.first().innerText()).trim();
                        if (btnText.toLowerCase() === match.entry.answer.toLowerCase()) {
                            await labelElement.first().click();
                            clicked = true;
                            log(`  → Clicked radio option: "${btnText}"`);
                            break;
                        }
                    }
                }
                if (!clicked) {
                    log(`  WARN: Could not find radio option matching "${match.entry.answer}"`);
                    allFilled = false;
                    // Recommendation 4
                    try { await page.screenshot({ path: `/tmp/chatbot-fail-radio-${Date.now()}.png` }); } catch { }
                    break;
                }

                await page.waitForTimeout(500);
                const saved = await clickChatbotSaveButton(sidebar, page, log);
                if (!saved) log(`  WARN: No Save button found after selecting radio option.`);

                // Recommendation 5: Auto-learn
                verifiedAnswers.push({ text: questionText, answer: match.entry.answer });

            } else if (inputType === 'checkbox') {
                const answers = match.entry.answer.split(',').map(a => a.trim().toLowerCase());
                const checkboxLabels = await sidebar.locator('label.mcc__label').all();
                let clickedCount = 0;

                for (const ans of answers) {
                    for (const label of checkboxLabels) {
                        const btnText = (await label.innerText()).trim();
                        // Recommendation 6: Fuzzy checkbox string matching
                        if (btnText.toLowerCase() === ans || btnText.toLowerCase().includes(ans) || ans.includes(btnText.toLowerCase())) {
                            await label.click();
                            clickedCount++;
                            log(`  → Clicked checkbox option: "${btnText}"`);
                            break;
                        }
                    }
                }

                if (clickedCount === 0) {
                    log(`  WARN: Could not find any checkbox option matching "${match.entry.answer}"`);
                    allFilled = false;
                    try { await page.screenshot({ path: `/tmp/chatbot-fail-check-${Date.now()}.png` }); } catch { }
                    break;
                }

                await page.waitForTimeout(500);
                const saved = await clickChatbotSaveButton(sidebar, page, log);
                if (!saved) log(`  WARN: No Save button found after selecting checkbox options.`);

                verifiedAnswers.push({ text: questionText, answer: match.entry.answer });

            } else if (inputType === 'text') {
                // Recommendation 2: Fix contenteditable filling
                const inputContainer = sidebar.locator(CHATBOT_SELECTORS.chatbotInputContainer);
                // Look for any typical input mechanism
                const standardInput = inputContainer.locator('input, textarea');
                const contentEditableDiv = inputContainer.locator('[contenteditable="true"]');

                let typed = false;

                if (await contentEditableDiv.count() > 0) {
                    // Playwright's .fill() throws error on contenteditable. Use click+type.
                    await contentEditableDiv.first().click();
                    await page.waitForTimeout(100);
                    await page.keyboard.type(match.entry.answer);
                    log(`  → Typed answer (contenteditable): "${match.entry.answer}"`);
                    typed = true;
                } else if (await standardInput.count() > 0) {
                    await standardInput.first().fill(match.entry.answer);
                    log(`  → Typed answer (input): "${match.entry.answer}"`);
                    typed = true;
                }

                if (typed) {
                    await page.waitForTimeout(300);
                    const saved = await clickChatbotSaveButton(sidebar, page, log);
                    if (!saved) {
                        log(`  → No Save button found, trying Enter key...`);
                        await page.keyboard.press('Enter');
                        log(`  → Pressed Enter to submit`);
                    }
                    verifiedAnswers.push({ text: questionText, answer: match.entry.answer });
                } else {
                    log(`  WARN: Input field not found inside chatbot_InputContainer`);
                    allFilled = false;
                    try { await page.screenshot({ path: `/tmp/chatbot-fail-text-${Date.now()}.png` }); } catch { }
                    break;
                }
            } else {
                log(`  WARN: No recognizable input type for this question.`);
                allFilled = false;
                break;
            }

            previousQuestionText = questionText;

            const nextQ = await waitForNextQuestion(sidebar, questionText, log, 5000);
            if (!nextQ) {
                log(`  → No new question appeared after save. Checking if sidebar is still open...`);
                if (!(await sidebar.isVisible())) {
                    log('QUESTIONNAIRE: Sidebar closed after save. Application may be complete!');
                    break;
                }
                await page.waitForTimeout(2000);
            }

        } catch (e: any) {
            log(`  WARN: Failed to fill "${questionText}": ${e.message}`);
            allFilled = false;
            try { await page.screenshot({ path: `/tmp/chatbot-fail-try-${Date.now()}.png` }); } catch { }
            break;
        }
    }

    if (questionCount >= MAX_QUESTIONS) {
        log('QUESTIONNAIRE: Reached max question limit. Stopping.');
        allFilled = false;
    }

    return { allFilled, verifiedAnswers };
}
