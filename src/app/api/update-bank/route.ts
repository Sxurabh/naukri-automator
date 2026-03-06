import { NextResponse } from 'next/server';
import type { QuestionBankEntry } from '@/src/app/lib/questionBank';

// Simple in-memory store for the active mission's question bank
// Since Next.js API routes are often stateless, this works best in a single-instance Node server (like during `next dev` or standard deployments)
// For Vercel Edge/Serverless, a database (like Redis/KV) is recommended, but this works for the current local automation usage.
let activeQuestionBank: QuestionBankEntry[] = [];
let lastUpdated: number = Date.now();

export async function POST(request: Request) {
    try {
        const { questionBank } = await request.json();

        if (Array.isArray(questionBank)) {
            activeQuestionBank = questionBank;
            lastUpdated = Date.now();
            return NextResponse.json({ success: true, count: activeQuestionBank.length, updated: lastUpdated });
        }

        return NextResponse.json({ error: 'Invalid question bank format' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update question bank' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ questionBank: activeQuestionBank, lastUpdated });
}
