import { runNaukriAutomation } from '@/src/app/lib/naukriAutomator';

export const dynamic = 'force-dynamic'; // Defaults to auto
export async function POST(request: Request) {
  try {
    const { cookie, section } = await request.json();

    if (!cookie || !section) {
      return new Response(JSON.stringify({ error: 'Missing cookie or section' }), { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // A helper function to push logs to the client
        const log = (message: string) => {
          controller.enqueue(encoder.encode(`${message}\n`));
        };

        try {
          await runNaukriAutomation({ cookie, section, log });
          log(`[${new Date().toLocaleTimeString()}] Automation Complete.`);
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