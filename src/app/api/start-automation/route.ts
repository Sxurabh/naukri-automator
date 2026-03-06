// sxurabh/naukri-automator/naukri-automator-2395bd3b0e42cdcc1775f3531cce259c26dbec88/src/app/api/start-automation/route.ts
import { runNaukriAutomation } from '@/src/app/lib/naukriAutomator';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { cookie, section, appliedJobIds, settings, questionBank } = await request.json();

    if (!cookie || !section) {
      return new Response(JSON.stringify({ error: 'Missing cookie or section' }), { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const log = (message: string) => {
          if (request.signal.aborted) return;
          try {
            controller.enqueue(encoder.encode(`${message}\n`));
          } catch (e) {
            // Ignore errors if stream is closed
          }
        };

        try {
          // Pre-load the active question bank store before starting
          try {
            const proto = request.headers.get('x-forwarded-proto') ?? 'http';
            const host = request.headers.get('host') ?? 'localhost:3000';
            const baseUrl = `${proto}://${host}`;

            await fetch(`${baseUrl}/api/update-bank`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ questionBank: questionBank || [] }),
            });
          } catch (e) {
            console.error("Failed to seed question bank API", e);
          }

          const newlyAppliedIds = await runNaukriAutomation({
            cookie,
            section,
            log,
            appliedJobIds: appliedJobIds || [],
            settings: settings || { jobsPerMission: 5, stealthMode: true },
            questionBank: questionBank || [],
            checkAbort: () => request.signal.aborted,
            getLatestQuestionBank: async () => {
              try {
                const proto = request.headers.get('x-forwarded-proto') ?? 'http';
                const host = request.headers.get('host') ?? 'localhost:3000';
                const baseUrl = `${proto}://${host}`;
                const res = await fetch(`${baseUrl}/api/update-bank`);
                if (!res.ok) return [];
                const data = await res.json();
                return data.questionBank || [];
              } catch (e) {
                return [];
              }
            }
          });

          log(`[${new Date().toLocaleTimeString()}] Automation Complete.`);

          if (newlyAppliedIds.length > 0) {
            log(`APPLIED_JOB_IDS:${JSON.stringify(newlyAppliedIds)}`);
          }

        } catch (e: any) {
          if (!request.signal.aborted) {
            console.error("Automation error:", e);
            log(`FATAL: ${e.message}`);
          }
        } finally {
          if (!request.signal.aborted) {
            try { controller.close(); } catch (e) { }
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-h',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'An internal server error occurred' }), { status: 500 });
  }
}