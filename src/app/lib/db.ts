import { createClient, Client } from '@libsql/client';
import path from 'path';

// Define the path to the SQLite database file
const dbPath = path.resolve(process.cwd(), 'naukri-automator.sqlite');

// Create a singleton instance for the database connection
let dbInstance: Client | null = null;

export const getDb = (): Client => {
    if (!dbInstance) {
        // Because @libsql/client natively supports generic SQLite DB files locally without node-gyp dependencies!
        dbInstance = createClient({
            url: `file:${dbPath}`
        });

        // Initialize tables if they don't exist
        dbInstance.execute(`
            CREATE TABLE IF NOT EXISTS question_bank (
                id TEXT PRIMARY KEY,
                originalText TEXT NOT NULL,
                keywords TEXT, -- Stored as JSON string
                inputType TEXT NOT NULL,
                options TEXT, -- Stored as JSON string
                answer TEXT,
                matchCount INTEGER DEFAULT 0,
                addedOn TEXT
            )
        `).then(() => console.log('Ensure question_bank table exists.'))
            .catch(e => console.error('Error creating question_bank table:', e));

        dbInstance.execute(`
            CREATE TABLE IF NOT EXISTS applied_jobs (
                id TEXT PRIMARY KEY,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).then(() => console.log('Ensure applied_jobs table exists.'))
            .catch(e => console.error('Error creating applied_jobs table:', e));

        console.log('Connected to the SQLite database at:', dbPath);
    }
    return dbInstance;
};

// Helper for Promisified Queries
export const dbQuery = async (sql: string, params: any[] = []): Promise<any[]> => {
    const db = getDb();
    const result = await db.execute({ sql, args: params });
    return result.rows as unknown as any[];
};

export const dbRun = async (sql: string, params: any[] = []): Promise<void> => {
    const db = getDb();
    await db.execute({ sql, args: params });
};
