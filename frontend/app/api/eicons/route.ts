const XARIAH_EICON_DATABASE_URL =
  'https://xariah.net/eicons/Home/EiconsDataBase/base.doc';

export async function GET() {
  try {
    const response = await fetch(XARIAH_EICON_DATABASE_URL, {
      headers: { Accept: 'text/plain' },
    });
    if (!response.ok) {
      return Response.json(
        { error: `The upstream eicon index returned HTTP ${response.status}.` },
        { status: 502 },
      );
    }

    return new Response(await response.text(), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return Response.json(
      { error: 'The upstream eicon index could not be reached.' },
      { status: 502 },
    );
  }
}
