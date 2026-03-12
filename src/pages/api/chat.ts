/**
 * POST /api/chat
 *
 * Receives a message (and optional conversation history) from the browser,
 * calls Claude Haiku with Tiago's context as the system prompt,
 * and returns the reply as JSON.
 *
 * Request body:  { message: string, history: { role: string, content: string }[], sessionId?: string }
 * Response body: { reply: string } | { error: string }
 */

import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';
import { Langfuse } from 'langfuse';
import CONTEXT from '../../data/context.md?raw';

// prerender = false → this route runs server-side on every request (not pre-built)
export const prerender = false;

// Clients are created once per cold start and reused across warm requests.
// In Astro/Vite, .env variables are exposed via import.meta.env (not process.env),
// so we pass keys explicitly. Set these in Vercel: Project → Settings → Environment Variables.
const client = new Anthropic({
  apiKey: import.meta.env.ANTHROPIC_API_KEY,
});

// process.env reads at runtime (not baked in at build time like import.meta.env),
// so these keys take effect immediately after being set in Vercel — no rebuild needed.
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? '',
  secretKey:  process.env.LANGFUSE_SECRET_KEY ?? '',
  baseUrl:    'https://us.cloud.langfuse.com',
});

const SYSTEM = `You are a personal assistant on Tiago Resmini's portfolio website.
Visitors ask you questions about Tiago's background, work experience, and case studies.
Your job is to answer helpfully and accurately.

Rules:
- Only answer from the context provided below. Never invent facts.
- Be concise and professional, but warm — you represent Tiago well.
- If a question isn't covered by the context, say so and suggest the visitor
  contacts Tiago directly at tiagoresmini@gmail.com.
- Never share sensitive personal data (home address, phone number, salary).
- Do not pretend to be Tiago himself — you are his assistant.
- Keep answers focused. Answer the specific question asked.
- Do not use markdown formatting. No **bold**, no bullet points, no # headers.
  Write in plain, conversational prose. Use a line break between paragraphs
  only when the answer genuinely needs breathing room.

--- TIAGO'S CONTEXT ---
${CONTEXT}`;

export const POST: APIRoute = async ({ request }) => {
  // --- Parse request body ---
  let message: string;
  let history: { role: string; content: string }[] = [];

  let sessionId = 'unknown';

  try {
    const body = await request.json();
    message = body.message;
    history = body.history ?? [];
    sessionId = body.sessionId ?? 'unknown';
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- Call Claude (wrapped in a Langfuse trace for observability) ---
  const messages = [...history, { role: 'user' as const, content: message }];
  const startTime = new Date();

  // trace groups all turns from the same visitor session in the Langfuse UI
  const trace = langfuse.trace({ name: 'portfolio-chat', sessionId });

  const generation = trace.generation({
    name: 'claude-haiku-response',
    model: 'claude-haiku-4-5',
    input: messages,
    startTime,
  });

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SYSTEM,
      messages,
    });

    const reply =
      response.content[0].type === 'text' ? response.content[0].text : '';

    generation.end({
      output: reply,
      endTime: new Date(),
      usage: {
        input:  response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    });

    // flushAsync() must be called before returning — Vercel terminates the
    // function the moment the Response is sent, so buffered events would be lost.
    try {
      await langfuse.flushAsync();
      console.log('[/api/chat] Langfuse flush OK — keys present:', {
        pub: !!process.env.LANGFUSE_PUBLIC_KEY,
        sec: !!process.env.LANGFUSE_SECRET_KEY,
      });
    } catch (lfErr) {
      console.error('[/api/chat] Langfuse flush error:', lfErr);
    }

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[/api/chat] Claude API error:', err);

    generation.end({ output: 'error', endTime: new Date() });
    try { await langfuse.flushAsync(); } catch { /* ignore */ }

    return new Response(JSON.stringify({ error: 'Failed to get a response. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
