import { describe, expect, it } from 'vitest';

import {
  characterAvatarUrl,
  characterIcon,
  extractFListCharacterName,
  extractFListProfile,
  parseFListProfileUrl,
  resolveFListProfileInput,
} from './FListProfile';

describe('F-list profile imports', () => {
  it('accepts only canonical HTTPS F-list character profile links', () => {
    expect(parseFListProfileUrl('https://www.f-list.net/c/fklr-r03/')).toEqual({
      character: 'fklr-r03',
      slug: 'fklr-r03',
      url: 'https://www.f-list.net/c/fklr-r03/',
    });
    expect(parseFListProfileUrl('https://f-list.net/c/EULR%20with%20a%20gun')).toEqual({
      character: 'EULR with a gun',
      slug: 'eulr with a gun',
      url: 'https://www.f-list.net/c/eulr%20with%20a%20gun/',
    });
    expect(parseFListProfileUrl('http://www.f-list.net/c/fklr-r03/')).toBeNull();
    expect(parseFListProfileUrl('https://www.f-list.net.evil.test/c/fklr-r03/')).toBeNull();
    expect(parseFListProfileUrl('https://www.f-list.net/character_edit.php')).toBeNull();
  });

  it('extracts decoded BBCode and exact F-list inline asset URLs', () => {
    const location = parseFListProfileUrl('https://www.f-list.net/c/fklr-r03/');
    expect(location).not.toBeNull();
    const html = `
      <div class='FormattedBlock' style='word-wrap:break-word;'>
        [center][img=3728954]falkeinline[/img][/center]<br />
        F&uuml;hrung &amp; &#039;Falke&#039;
      </div>
      <input type='hidden' id='profile-character-name' value='FKLR-R03'/>
      <script>
        FList.Inlines.inlines = {"3728954":{"hash":"f48f8fc16b03b84a2233f798666a636a6dbae96a","extension":"png","nsfw":false}};
      </script>
    `;

    const profile = extractFListProfile(html, location!);

    expect(profile.character).toBe('FKLR-R03');
    expect(profile.bbcode).toContain('[img=3728954]falkeinline[/img]');
    expect(profile.bbcode).toContain("Führung & 'Falke'");
    expect(profile.inlines['3728954']).toEqual({
      id: '3728954',
      extension: 'png',
      nsfw: false,
      url: 'https://static.f-list.net/images/charinline/f4/8f/f48f8fc16b03b84a2233f798666a636a6dbae96a.png',
    });
    expect(profile.avatarUrl).toBe(
      'https://static.f-list.net/images/avatar/fklr-r03.png',
    );
  });

  it('builds safe character avatar URLs used by icon tags', () => {
    expect(characterAvatarUrl('EULR with a gun')).toBe(
      'https://static.f-list.net/images/avatar/eulr%20with%20a%20gun.png',
    );
    expect(characterAvatarUrl('../avatar')).toBeNull();
  });

  it('validates public character lookup results before creating an icon', () => {
    const html = "<input type='hidden' id='profile-character-name' value='FKLR-R03'/>";

    expect(extractFListCharacterName(html)).toBe('FKLR-R03');
    expect(extractFListCharacterName('<h1>Character not found</h1>')).toBeNull();
    expect(characterIcon('FKLR-R03')).toEqual({
      character: 'FKLR-R03',
      profileUrl: 'https://www.f-list.net/c/fklr-r03/',
      avatarUrl: 'https://static.f-list.net/images/avatar/fklr-r03.png',
    });
  });
});

describe('F-list profile import input', () => {
  const location = {
    character: 'fklr-r03',
    slug: 'fklr-r03',
    url: 'https://www.f-list.net/c/fklr-r03/',
  };

  it('accepts a bare character name and builds the profile link', () => {
    expect(resolveFListProfileInput('  fklr-r03 ')).toEqual(location);
    expect(resolveFListProfileInput('EULR with a gun')).toEqual({
      character: 'EULR with a gun',
      slug: 'eulr with a gun',
      url: 'https://www.f-list.net/c/eulr%20with%20a%20gun/',
    });
  });

  it('still accepts full profile links, with or without the scheme', () => {
    expect(resolveFListProfileInput('https://www.f-list.net/c/fklr-r03/')).toEqual(location);
    expect(resolveFListProfileInput('www.f-list.net/c/fklr-r03')).toEqual(location);
    expect(resolveFListProfileInput('f-list.net/c/fklr-r03/')).toEqual(location);
  });

  it('rejects other sites, other pages and invalid names', () => {
    expect(resolveFListProfileInput('https://example.com/c/fklr-r03/')).toBeNull();
    expect(resolveFListProfileInput('http://www.f-list.net/c/fklr-r03/')).toBeNull();
    expect(resolveFListProfileInput('f-list.net/character_edit.php')).toBeNull();
    expect(resolveFListProfileInput('../avatar')).toBeNull();
    expect(resolveFListProfileInput('   ')).toBeNull();
  });
});
