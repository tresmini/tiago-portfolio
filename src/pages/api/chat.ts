/**
 * POST /api/chat
 *
 * Receives a message (and optional conversation history) from the browser,
 * calls Claude Haiku with Tiago's context as the system prompt,
 * and returns the reply as JSON.
 *
 * Request body:  { message: string, history: { role: string, content: string }[] }
 * Response body: { reply: string } | { error: string }
 */

import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';
import CONTEXT from '../../data/context.md?raw';

// prerender = false → this route runs server-side on every request (not pre-built)
export const prerender = false;

// Client is created once per cold start, reused across warm requests.
// In Astro/Vite, .env variables are exposed via import.meta.env (not process.env),
// so we pass the key explicitly. Set this in Vercel: Project → Settings → Environment Variables.
const client = new Anthropic({
  apiKey: import.meta.env.ANTHROPIC_API_KEY,
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

  try {
    const body = await request.json();
    message = body.message;
    history = body.history ?? [];
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

  // --- Call Claude ---
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [
        ...history,
        { role: 'user', content: message },
      ],
    });

    const reply =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[/api/chat] Claude API error:', err);
    return new Response(JSON.stringify({ error: 'Failed to get a response. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
