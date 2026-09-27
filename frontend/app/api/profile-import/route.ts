import {
  extractFListProfile,
  parseFListProfileUrl,
} from '../../../editor-app/models/FListProfile';

const MAX_PROFILE_BYTES = 2_000_000;

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const location = parseFListProfileUrl(requestUrl.searchParams.get('url') ?? '');
  if (!location) {
    return Response.json(
      { error: 'Enter a full F-list profile link such as https://www.f-list.net/c/character/.' },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(location.url, {
      redirect: 'follow',
      headers: {
        Accept: 'text/html; charset=utf-8',
        Cookie: 'warning=1',
        'User-Agent': 'F-list-Profile-Editor/1.0 (+profile import)',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return Response.json(
        { error: response.status === 404 ? 'That F-list profile was not found.' : 'F-list did not return the profile.' },
        { status: response.status === 404 ? 404 : 502 },
      );
    }

    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_PROFILE_BYTES) {
      return Response.json({ error: 'That profile is too large to import safely.' }, { status: 413 });
    }

    const html = await response.text();
    if (html.length > MAX_PROFILE_BYTES) {
      return Response.json({ error: 'That profile is too large to import safely.' }, { status: 413 });
    }

    return Response.json(extractFListProfile(html, location), {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return Response.json(
      { error: message || 'The public F-list profile could not be imported.' },
      { status: message.includes('importable description') ? 422 : 502 },
    );
  }
}
