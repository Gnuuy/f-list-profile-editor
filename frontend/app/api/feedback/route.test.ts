import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MAX_FEEDBACK_LENGTH } from '../../../editor-app/models/Feedback';
import { saveFeedback } from './feedbackFile';
import { POST } from './route';

let folder: string;
let file: string;

function post(body: string, headers: Record<string, string> = {}) {
  return POST(new Request('https://editor.test/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  }));
}

describe('feedback route', () => {
  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'feedback-'));
    file = join(folder, 'feedback.txt');
    process.env.FEEDBACK_FILE = file;
  });

  afterEach(async () => {
    delete process.env.FEEDBACK_FILE;
    await rm(folder, { recursive: true, force: true });
  });

  it('writes only the feedback text, nothing about who sent it', async () => {
    const response = await post(JSON.stringify({ text: '  Love the dark theme!\r\nMore colours please.  ' }), {
      'User-Agent': 'Secret Browser 1.0',
      'X-Forwarded-For': '203.0.113.7',
      Referer: 'https://example.com/private',
    });
    await post(JSON.stringify({ text: 'Second note' }));

    expect(response.status).toBe(204);
    const saved = await readFile(file, 'utf8');
    expect(saved).toBe([
      'Love the dark theme!',
      'More colours please.',
      '-'.repeat(40),
      'Second note',
      '-'.repeat(40),
      '',
    ].join('\n'));
    expect(saved).not.toMatch(/203\.0\.113\.7|Secret Browser|example\.com|\d{4}-\d{2}-\d{2}/);
  });

  it('rejects empty, oversized and malformed feedback without writing', async () => {
    expect((await post(JSON.stringify({ text: '   ' }))).status).toBe(400);
    expect((await post('not json')).status).toBe(400);
    expect((await post(JSON.stringify({ text: 'x'.repeat(MAX_FEEDBACK_LENGTH + 1) }))).status).toBe(413);
    await expect(readFile(file, 'utf8')).rejects.toThrow();
  });

  it('stops accepting feedback once the file is full', async () => {
    await writeFile(file, 'x'.repeat(100));
    await expect(saveFeedback('More', file, 100)).rejects.toMatchObject({ status: 503 });
  });
});
