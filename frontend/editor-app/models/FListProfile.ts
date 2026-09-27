import { decode } from 'html-entities';

const F_LIST_PROFILE_HOSTS = new Set(['f-list.net', 'www.f-list.net']);
const F_LIST_STATIC_ORIGIN = 'https://static.f-list.net';
const CHARACTER_NAME = /^[a-z0-9_ -]+$/i;
const INLINE_HASH = /^[a-f0-9]{40}$/i;
const INLINE_EXTENSION = /^[a-z0-9]{1,8}$/i;

export type FListInlineAsset = {
  id: string;
  url: string;
  extension: string;
  nsfw: boolean;
};

export type FListProfileImport = {
  character: string;
  profileUrl: string;
  avatarUrl: string;
  bbcode: string;
  inlines: Record<string, FListInlineAsset>;
};

export type FListCharacterIcon = {
  character: string;
  profileUrl: string;
  avatarUrl: string;
};

export type FListProfileLocation = {
  character: string;
  slug: string;
  url: string;
};

type RawInlineAsset = {
  hash?: unknown;
  extension?: unknown;
  nsfw?: unknown;
};

export function parseFListProfileUrl(value: string): FListProfileLocation | null {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return null;
  }

  if (
    parsed.protocol !== 'https:'
    || !F_LIST_PROFILE_HOSTS.has(parsed.hostname.toLowerCase())
    || parsed.port
    || parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
  ) {
    return null;
  }

  const match = parsed.pathname.match(/^\/c\/([^/]+)\/?$/i);
  if (!match) return null;

  let character: string;
  try {
    character = decodeURIComponent(match[1]).trim();
  } catch {
    return null;
  }
  return fListCharacterLocation(character);
}

export function normalizeFListCharacterName(value: string): string | null {
  const normalized = value.trim();
  return normalized && normalized.length <= 64 && CHARACTER_NAME.test(normalized)
    ? normalized
    : null;
}

export function fListCharacterLocation(character: string): FListProfileLocation | null {
  const normalized = normalizeFListCharacterName(character);
  if (!normalized) return null;

  const slug = normalized.toLowerCase();
  return {
    character: normalized,
    slug,
    url: `https://www.f-list.net/c/${encodeURIComponent(slug)}/`,
  };
}

/**
 * Accepts a full profile link or just a character name, since every F-list
 * profile lives at https://www.f-list.net/c/<name>/.
 */
export function resolveFListProfileInput(value: string): FListProfileLocation | null {
  const trimmed = value.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return parseFListProfileUrl(trimmed);
  if (/^(www\.)?f-list\.net\//i.test(trimmed)) return parseFListProfileUrl(`https://${trimmed}`);
  return fListCharacterLocation(trimmed);
}

export function characterAvatarUrl(character: string): string | null {
  const normalized = normalizeFListCharacterName(character);
  if (!normalized) return null;
  return `${F_LIST_STATIC_ORIGIN}/images/avatar/${encodeURIComponent(normalized.toLowerCase())}.png`;
}

export function characterIcon(character: string): FListCharacterIcon | null {
  const location = fListCharacterLocation(character);
  const avatarUrl = characterAvatarUrl(character);
  if (!location || !avatarUrl) return null;

  return {
    character: location.character,
    profileUrl: location.url,
    avatarUrl,
  };
}

export function extractFListProfile(
  html: string,
  location: FListProfileLocation,
): FListProfileImport {
  const descriptionMatch = html.match(
    /<div\b[^>]*class\s*=\s*(['"])[^'"]*\bFormattedBlock\b[^'"]*\1[^>]*>([\s\S]*?)<\/div>/i,
  );
  if (!descriptionMatch) {
    throw new Error('This public profile does not contain an importable description.');
  }

  const bbcode = decode(
    descriptionMatch[2].replace(/<br\s*\/?>/gi, '\n'),
    { level: 'html5' },
  ).replace(/\r\n?/g, '\n');

  const inlineMatch = html.match(/FList\.Inlines\.inlines\s*=\s*(\{[\s\S]*?\})\s*;/i);
  const rawInlines = inlineMatch
    ? parseInlineMetadata(inlineMatch[1])
    : {};
  const inlines: Record<string, FListInlineAsset> = {};

  for (const [id, raw] of Object.entries(rawInlines)) {
    if (!/^\d+$/.test(id) || !raw || typeof raw !== 'object') continue;
    const hash = typeof raw.hash === 'string' ? raw.hash.toLowerCase() : '';
    const extension = typeof raw.extension === 'string'
      ? raw.extension.toLowerCase()
      : '';
    if (!INLINE_HASH.test(hash) || !INLINE_EXTENSION.test(extension)) continue;

    inlines[id] = {
      id,
      extension,
      nsfw: raw.nsfw === true,
      url: `${F_LIST_STATIC_ORIGIN}/images/charinline/${hash.slice(0, 2)}/${hash.slice(2, 4)}/${hash}.${extension}`,
    };
  }

  const displayedName = extractFListCharacterName(html) || location.character;
  const avatarUrl = characterAvatarUrl(displayedName)
    ?? characterAvatarUrl(location.character);
  if (!avatarUrl) throw new Error('The profile character name is invalid.');

  return {
    character: displayedName,
    profileUrl: location.url,
    avatarUrl,
    bbcode,
    inlines,
  };
}

function parseInlineMetadata(value: string): Record<string, RawInlineAsset> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object'
      ? parsed as Record<string, RawInlineAsset>
      : {};
  } catch {
    return {};
  }
}

export function extractFListCharacterName(html: string): string | null {
  const hiddenName = html.match(
    /<input\b[^>]*id\s*=\s*(['"])profile-character-name\1[^>]*value\s*=\s*(['"])(.*?)\2[^>]*>/i,
  )?.[3];
  if (!hiddenName) return null;

  return normalizeFListCharacterName(decode(hiddenName, { level: 'html5' }));
}
