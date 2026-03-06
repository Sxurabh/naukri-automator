// Shared types and utilities for the Question Bank feature

export interface QuestionBankEntry {
    id: string;
    originalText: string;
    keywords: string[];
    inputType: 'text' | 'dropdown' | 'radio' | 'checkbox';
    options: string[] | null;
    answer: string | null;
    matchCount: number;
    addedOn: string;
}

// Scraped question from the sidebar (before it becomes a bank entry)
export interface ScrapedQuestion {
    text: string;
    inputType: 'text' | 'dropdown' | 'radio' | 'checkbox';
    options: string[] | null;
}

// Stop words to remove during normalization
const STOP_WORDS = new Set([
    'what', 'is', 'your', 'the', 'a', 'an', 'in', 'to', 'do', 'you',
    'have', 'are', 'please', 'provide', 'enter', 'select', 'mention',
    'of', 'for', 'and', 'or', 'this', 'that', 'how', 'many', 'much',
    'can', 'will', 'would', 'should', 'be', 'been', 'being', 'has',
    'had', 'does', 'did', 'was', 'were', 'with', 'from', 'at', 'by',
    'on', 'about', 'if', 'then', 'than', 'so', 'any', 'our', 'us',
    'me', 'my', 'i', 'we', 'they', 'them', 'their', 'its',
]);

/**
 * Normalize text: lowercase, remove punctuation, strip stop words
 */
export function normalize(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
}

/**
 * Extract meaningful keywords from text
 */
export function extractKeywords(text: string): string[] {
    const normalized = normalize(text);
    return normalized
        .split(/\s+/)
        .filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

/**
 * Jaccard similarity score between two keyword arrays
 */
export function jaccardScore(a: string[], b: string[]): number {
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    if (union.size === 0) return 0;
    return intersection.size / union.size;
}

/**
 * Generate a deterministic ID from question text
 */
export function generateQuestionId(text: string): string {
    const normalized = normalize(text);
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32-bit integer
    }
    return `q_${Math.abs(hash).toString(36)}`;
}

/**
 * Find the best matching entry in the question bank for a given question
 * Returns null if no match found above threshold
 */
export function findBestMatch(
    questionText: string,
    bank: QuestionBankEntry[],
    threshold: number = 0.6
): { entry: QuestionBankEntry; score: number } | null {
    const normalizedQuery = normalize(questionText);

    // First attempt an exact match on the normalized question string
    // This prevents duplicating questions that are entirely stop words
    for (const entry of bank) {
        if (normalize(entry.originalText) === normalizedQuery) {
            return { entry, score: 1.0 };
        }
    }

    const queryKeywords = extractKeywords(questionText);
    if (queryKeywords.length === 0) return null;

    let bestMatch: { entry: QuestionBankEntry; score: number } | null = null;

    for (const entry of bank) {
        const score = jaccardScore(queryKeywords, entry.keywords);
        if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { entry, score };
        }
    }

    return bestMatch;
}

/**
 * Create a new QuestionBankEntry from a scraped question
 */
export function createBankEntry(scraped: ScrapedQuestion): QuestionBankEntry {
    return {
        id: generateQuestionId(scraped.text),
        originalText: scraped.text,
        keywords: extractKeywords(scraped.text),
        inputType: scraped.inputType,
        options: scraped.options,
        answer: null,
        matchCount: 0,
        addedOn: new Date().toISOString(),
    };
}

/**
 * Merge scraped questions into an existing bank.
 * Returns the updated bank and count of new questions added.
 */
export function mergeIntoBankEntries(
    existingBank: QuestionBankEntry[],
    scrapedQuestions: ScrapedQuestion[]
): { updatedBank: QuestionBankEntry[]; newCount: number } {
    const updatedBank = [...existingBank];
    let newCount = 0;

    for (const scraped of scrapedQuestions) {
        const match = findBestMatch(scraped.text, updatedBank, 0.7);

        if (match) {
            // Existing question — increment match count
            match.entry.matchCount += 1;
        } else {
            // New question — add to bank
            updatedBank.push(createBankEntry(scraped));
            newCount++;
        }
    }

    return { updatedBank, newCount };
}
