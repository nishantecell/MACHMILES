import { handleCors, badReq, err } from '../_lib/helpers.js';

const SYSTEM_CHAT = 'You are an expert AI career coach specializing in tech job searches in India. Help with resume advice, interview prep, salary negotiation, and career guidance. Be concise and actionable.';
const SYSTEM_INTERVIEW = 'You are an expert technical interviewer and career coach. Provide strong, structured interview answers. Use the STAR method for behavioral questions. Keep answers under 150 words, clear and impactful.';

async function tryOpenAI(systemPrompt, messages, maxTokens) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('NO_OPENAI_KEY');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const code = response.status;
    throw new Error(`OPENAI_${code}:${errData?.error?.message || ''}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function tryGemini(systemPrompt, messages, maxTokens) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_GEMINI_KEY');

  // Convert messages to Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`GEMINI_${response.status}:${errData?.error?.message || ''}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return badReq(res, 'Method not allowed');

  const { messages, mode } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) return badReq(res, 'messages array required');

  const systemPrompt = mode === 'interview' ? SYSTEM_INTERVIEW : SYSTEM_CHAT;
  const maxTokens = mode === 'interview' ? 300 : 500;

  // Try OpenAI first, fall back to Gemini
  let content = '';
  let lastError = '';

  try {
    content = await tryOpenAI(systemPrompt, messages, maxTokens);
  } catch (e) {
    console.warn('OpenAI failed, trying Gemini fallback:', e.message);
    lastError = e.message;
    try {
      content = await tryGemini(systemPrompt, messages, maxTokens);
    } catch (e2) {
      console.error('Gemini fallback also failed:', e2.message);
      lastError = e2.message;
    }
  }

  if (!content) {
    const noKey = lastError.includes('NO_OPENAI_KEY') && lastError.includes('NO_GEMINI_KEY');
    if (noKey) return res.status(503).json({ success: false, message: 'AI service not configured. Please contact support.' });
    return res.status(503).json({ success: false, message: 'AI service is temporarily unavailable. Please try again in a moment.' });
  }

  return res.status(200).json({ success: true, content });
}
