// sxurabh/naukri-automator/naukri-automator-2395bd3b0e42cdcc1775f3531cce259c26dbec88/src/app/api/start-automation/route.ts
import { runNaukriAutomation } from '@/src/app/lib/naukriAutomator';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { cookie, section, appliedJobIds, settings } = await request.json();

    if (!cookie || !section) {
      return new Response(JSON.stringify({ error: 'Missing cookie or section' }), { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const log = (message: string) => {
          controller.enqueue(encoder.encode(`${message}\n`));
        };

        try {
          const newlyAppliedIds = await runNaukriAutomation({ 
            cookie, 
            section, 
            log, 
            appliedJobIds: appliedJobIds || [],
            settings: settings || { jobsPerMission: 5, stealthMode: true } // Pass settings, with a fallback
          });

          log(`[${new Date().toLocaleTimeString()}] Automation Complete.`);
          
          if (newlyAppliedIds.length > 0) {
            log(`APPLIED_JOB_IDS:${JSON.stringify(newlyAppliedIds)}`);
          }

        } catch (e: any) {
          console.error("Automation error:", e);
          log(`FATAL: ${e.message}`);
        } finally {
          controller.close();
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