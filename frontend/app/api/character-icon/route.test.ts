import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

describe('character icon lookup route', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('resolves a verified public character to its profile and avatar URLs', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(new Response(
      "<input type='hidden' id='profile-character-name' value='FKLR-R03'/>",
      { status: 200, headers: { 'Content-Type': 'text/html' } },
    ));
    vi.stubGlobal('fetch', upstreamFetch);

    const response = await GET(new Request(
      'https://editor.test/api/character-icon?name=FKLR-R03',
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      character: 'FKLR-R03',
      profileUrl: 'https://www.f-list.net/c/fklr-r03/',
      avatarUrl: 'https://static.f-list.net/images/avatar/fklr-r03.png',
    });
    expect(upstreamFetch).toHaveBeenCalledWith(
      'https://www.f-list.net/c/fklr-r03/',
      expect.objectContaining({ redirect: 'follow' }),
    );
  });

  it('rejects a missing public character instead of inserting a default avatar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      '<h1>Character not found</h1>',
      { status: 200, headers: { 'Content-Type': 'text/html' } },
    )));

    const response = await GET(new Request(
      'https://editor.test/api/character-icon?name=Missing Character',
    ));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'That F-list character was not found.',
    });
  });
});
