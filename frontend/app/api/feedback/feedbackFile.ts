import { appendFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { MAX_FEEDBACK_LENGTH } from '../../../editor-app/models/Feedback';

// Feedback goes into one plain-text file, one entry after another. Only the
// text itself is written: no names, addresses, timestamps or request details.
const ENTRY_SEPARATOR = '-'.repeat(40);
const MAX_FILE_BYTES = 10_000_000;

export class FeedbackError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Set FEEDBACK_FILE to store it elsewhere; defaults to feedback.txt in the app folder. */
export function feedbackFilePath(): string {
  return resolve(process.env.FEEDBACK_FILE || 'feedback.txt');
}

export function normalizeFeedback(value: unknown): string {
  const text = typeof value === 'string'
    ? value
      .replace(/\r\n?/g, '\n')
      // Keep newlines and tabs; drop other control characters.
      .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
      .trim()
    : '';
  if (!text) throw new FeedbackError('Write some feedback first.', 400);
  if (text.length > MAX_FEEDBACK_LENGTH) {
    throw new FeedbackError(`Feedback can be at most ${MAX_FEEDBACK_LENGTH} characters.`, 413);
  }
  return text;
}

export function feedbackEntry(text: string): string {
  return `${text}\n${ENTRY_SEPARATOR}\n`;
}

export async function saveFeedback(
  text: string,
  file = feedbackFilePath(),
  maxFileBytes = MAX_FILE_BYTES,
): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  const size = await stat(file).then(info => info.size, () => 0);
  // Stops anyone filling the disk: the file only grows until you clear it.
  if (size >= maxFileBytes) {
    throw new FeedbackError('Feedback is full right now. Please try again later.', 503);
  }
  await appendFile(file, feedbackEntry(text), { encoding: 'utf8', mode: 0o600 });
}
