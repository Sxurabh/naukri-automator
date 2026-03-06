import { getDb } from '../../../lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Calling getDb initializes via serialize, making sure tables exist
        getDb();

        return NextResponse.json({ success: true, message: "Database initialized successfully" });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
