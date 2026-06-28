import { handleCors, badReq, err } from '../_lib/helpers.js';

const SYSTEM_MSG = {
  role: 'system',
  content: 'You are an expert AI career coach specializing in tech job searches in India. Help with resume advice, interview prep, salary negotiation, and career guidance. Be concise and actionable.',
};

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return badReq(res, 'Method not allowed');

  const { messages, mode } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) return badReq(res, 'messages array required');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ success: false, message: 'AI service not configured on the server.' });
  }

  const systemMsg = mode === 'interview'
    ? { role: 'system', content: 'You are an expert technical interviewer and career coach. Provide strong, structured interview answers. Use the STAR method for behavioral questions. Keep answers under 150 words, clear and impactful.' }
    : SYSTEM_MSG;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [systemMsg, ...messages], max_tokens: mode === 'interview' ? 300 : 500 }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData?.error?.message || `OpenAI error ${response.status}`;
      console.error('OpenAI error:', msg);
      if (response.status === 429) return res.status(503).json({ success: false, message: 'AI service is busy. Please try again in a moment.' });
      return res.status(502).json({ success: false, message: 'AI service unavailable. Please try again.' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ success: true, content });
  } catch (e) {
    console.error('AI handler error:', e.message);
    return err(res, 'Failed to reach AI service. Please try again.');
  }
}
