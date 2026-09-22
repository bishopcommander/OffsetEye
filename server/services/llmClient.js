/**
 * LLM Client — single point of contact with the LLM API
 *
 * ALL LLM calls in this codebase MUST go through this module.
 * Never call the LLM provider SDK directly from another file.
 *
 * IMPORTANT — data governance:
 * Document text and embeddings are sent to a third-party LLM API.
 * This is acceptable ONLY because this prototype uses public/synthetic data
 * (Volve, Sodir, FORCE 2020, 3W, Texas RRC) — never real OIL data.
 * A production OIL deployment must reconsider this decision
 * (self-hosted embeddings/LLM) as a data-governance requirement.
 *
 * Provider is selected by LLM_PROVIDER env var: 'openai' | 'anthropic' | 'gemini'
 * Default: openai
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const PROVIDER = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
const API_KEY  = process.env.LLM_API_KEY;
const MODEL    = process.env.LLM_MODEL || 'gpt-4o-mini';

if (!API_KEY) {
  console.warn('[llmClient] WARNING: LLM_API_KEY is not set. LLM calls will fail.');
}

/**
 * Send a chat-completion request to the configured LLM provider.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} [options]
 * @param {number} [options.temperature=0]       - 0 for extraction/parsing, higher for summaries
 * @param {number} [options.max_tokens=1024]
 * @returns {Promise<string>} - the assistant's reply text
 */
async function chat(messages, options = {}) {
  const { temperature = 0, max_tokens = 1024 } = options;

  if (PROVIDER === 'openai') {
    const { OpenAI } = require('openai');
    const client = new OpenAI({ apiKey: API_KEY });
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature,
      max_tokens,
    });
    return response.choices[0].message.content;
  }

  if (PROVIDER === 'anthropic') {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.Anthropic({ apiKey: API_KEY });
    // Anthropic uses a separate system param
    const system = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');
    const response = await client.messages.create({
      model: MODEL,
      max_tokens,
      system,
      messages: userMessages,
    });
    return response.content[0].text;
  }

  if (PROVIDER === 'gemini') {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL });
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  throw new Error(`[llmClient] Unknown LLM_PROVIDER: "${PROVIDER}". Set to openai, anthropic, or gemini.`);
}

/**
 * Generate an embedding vector for the given text.
 * Currently only implemented for OpenAI (text-embedding-ada-002 / text-embedding-3-small).
 *
 * @param {string} text
 * @returns {Promise<number[]>} - embedding vector
 */
async function embed(text) {
  if (PROVIDER === 'openai') {
    const { OpenAI } = require('openai');
    const client = new OpenAI({ apiKey: API_KEY });
    const response = await client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  }
  throw new Error(`[llmClient] embed() not yet implemented for provider "${PROVIDER}"`);
}

module.exports = { chat, embed };
