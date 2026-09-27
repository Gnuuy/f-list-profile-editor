import {
  characterIcon,
  extractFListCharacterName,
  fListCharacterLocation,
} from '../../../editor-app/models/FListProfile';

const MAX_PROFILE_BYTES = 2_000_000;

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const location = fListCharacterLocation(requestUrl.searchParams.get('name') ?? '');
  if (!location) {
    return Response.json(
      { error: 'Enter a valid F-list character name.' },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(location.url, {
      redirect: 'follow',
      headers: {
        Accept: 'text/html; charset=utf-8',
        Cookie: 'warning=1',
        'User-Agent': 'F-list-Profile-Editor/1.0 (+character icon lookup)',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return Response.json(
        { error: response.status === 404 ? 'That F-list character was not found.' : 'F-list did not return the character.' },
        { status: response.status === 404 ? 404 : 502 },
      );
    }

    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_PROFILE_BYTES) {
      return Response.json({ error: 'That character profile is too large to check safely.' }, { status: 413 });
    }

    const html = await response.text();
    if (html.length > MAX_PROFILE_BYTES) {
      return Response.json({ error: 'That character profile is too large to check safely.' }, { status: 413 });
    }

    const displayedName = extractFListCharacterName(html);
    const result = displayedName ? characterIcon(displayedName) : null;
    if (!result) {
      return Response.json({ error: 'That F-list character was not found.' }, { status: 404 });
    }

    return Response.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return Response.json(
      { error: message || 'The F-list character could not be checked.' },
      { status: 502 },
    );
  }
}
