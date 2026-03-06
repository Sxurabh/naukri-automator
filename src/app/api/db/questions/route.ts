import { dbQuery, dbRun } from '../../../lib/db';
import { QuestionBankEntry } from '../../../lib/questionBank';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const rows = await dbQuery('SELECT * FROM question_bank');

        // Map SQLite rows back to QuestionBankEntry type
        const questions: QuestionBankEntry[] = rows.map((row: any) => ({
            id: row.id,
            originalText: row.originalText,
            keywords: row.keywords ? JSON.parse(row.keywords) : [],
            inputType: row.inputType as any,
            options: row.options ? JSON.parse(row.options) : null,
            answer: row.answer || null,
            matchCount: row.matchCount,
            addedOn: row.addedOn,
        }));

        return NextResponse.json(questions);
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { questionBank } = body;

        if (!Array.isArray(questionBank)) {
            return NextResponse.json({ success: false, error: "Invalid payload, expected array" }, { status: 400 });
        }

        // We will do a simple REPLACE INTO loop (SQLite Upsert)
        for (const entry of questionBank as QuestionBankEntry[]) {
            const keywordsStr = entry.keywords ? JSON.stringify(entry.keywords) : null;
            const optionsStr = entry.options ? JSON.stringify(entry.options) : null;

            await dbRun(`
                REPLACE INTO question_bank (id, originalText, keywords, inputType, options, answer, matchCount, addedOn) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             `, [entry.id, entry.originalText, keywordsStr, entry.inputType, optionsStr, entry.answer || null, entry.matchCount, entry.addedOn]);
        }

        return NextResponse.json({ success: true, message: `Upserted ${questionBank.length} questions` });
    } catch (error: any) {
        console.error("DB Save Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
