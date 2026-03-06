import { dbQuery, dbRun } from '../../../lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const rows = await dbQuery('SELECT id FROM applied_jobs');
        const jobs: string[] = rows.map((row: any) => row.id);

        return NextResponse.json(jobs);
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
        const { jobIds } = body;

        if (!Array.isArray(jobIds)) {
            return NextResponse.json({ success: false, error: "Invalid payload, expected array" }, { status: 400 });
        }

        // We will insert ignoring duplicates
        for (const id of jobIds as string[]) {
            await dbRun(`INSERT OR IGNORE INTO applied_jobs (id) VALUES (?)`, [id]);
        }

        return NextResponse.json({ success: true, message: `Inserted ${jobIds.length} jobs` });
    } catch (error: any) {
        console.error("DB Save Jobs Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
