import { FeedbackError, normalizeFeedback, saveFeedback } from './feedbackFile';

// Room for the maximum feedback length plus the JSON wrapper and escaping.
const MAX_REQUEST_BYTES = 64_000;
const TOO_LONG = 'That feedback is too long to send.';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get('content-length') ?? 0) > MAX_REQUEST_BYTES) {
      throw new FeedbackError(TOO_LONG, 413);
    }
    const body = await request.text();
    if (body.length > MAX_REQUEST_BYTES) throw new FeedbackError(TOO_LONG, 413);

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new FeedbackError('Write some feedback first.', 400);
    }
    const text = normalizeFeedback(
      typeof payload === 'object' && payload !== null ? (payload as { text?: unknown }).text : undefined,
    );

    // Only the text is saved. Nothing about the request (IP, browser,
    // referrer, time) is read or written.
    await saveFeedback(text);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof FeedbackError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    // Log why saving failed, never what was written.
    console.error('Feedback could not be saved:', error instanceof Error ? error.message : error);
    return Response.json(
      { error: 'Your feedback could not be saved. Please try again later.' },
      { status: 500 },
    );
  }
}
