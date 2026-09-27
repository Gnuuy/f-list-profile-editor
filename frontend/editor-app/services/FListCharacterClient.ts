import type { FListCharacterIcon } from '../models/FListProfile';

type LookupError = {
  error?: string;
};

export async function lookupFListCharacterIcon(
  character: string,
  signal?: AbortSignal,
): Promise<FListCharacterIcon> {
  const response = await fetch(
    `/api/character-icon?name=${encodeURIComponent(character.trim())}`,
    { signal },
  );
  const payload = await response.json() as FListCharacterIcon & LookupError;
  if (!response.ok) {
    const upstreamMessage = payload.error ?? '';
    throw new Error(
      /^internal error(?:;|$)/i.test(upstreamMessage)
        ? 'F-list could not be reached. Try the lookup again in a moment.'
        : upstreamMessage || 'The F-list character could not be found.',
    );
  }
  return payload;
}
