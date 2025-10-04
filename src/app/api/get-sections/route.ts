// sxurabh/naukri-automator/naukri-automator-2395bd3b0e42cdcc1775f3531cce259c26dbec88/src/app/api/get-sections/route.ts
import { getNaukriSections } from '@/src/app/lib/getNaukriSections';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { cookie } = await request.json();

    if (!cookie) {
      return NextResponse.json({ error: 'Missing cookie' }, { status: 400 });
    }

    const sections = await getNaukriSections(cookie);

    return NextResponse.json(sections);

  } catch (error: any) {
    console.error('Failed to get naukri sections:', error);

    // Check for our custom auth error and return a specific status code
    if (error.message.includes('Authentication failed')) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: 'An internal server error occurred', details: error.message }, { status: 500 });
  }
}