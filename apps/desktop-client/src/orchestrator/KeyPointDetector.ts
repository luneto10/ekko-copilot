import { AzureOpenAI } from 'openai';
import { env, isOpenAiConfigured } from '../env';
import { debug } from '../debug/DebugBus';
import { KEYPOINT_SYSTEM } from './prompts';
import { IntentDetector } from './IntentDetector';

/** A groundable point the customer raised, named freely (not from a fixed list). */
export interface DetectedKeyPoint {
  /** Short, free-form label, e.g. "Pricing", "Data Residency". */
  topic: string;
  /** Concise search query for Work IQ. */
  query: string;
}

/**
 * Decides which lines in the call are "key points" worth grounding.
 *
 * This is the seam for swapping detection strategies: the orchestrator depends
 * only on this interface, so the AI implementation can be replaced (or A/B'd)
 * without touching the pipeline.
 */
export interface KeyPointDetector {
  /** Implementation name, for debug gauges. */
  readonly name: string;
  /** Returns a key point to ground, or `null` to ignore the utterance. */
  detect(utterance: string, context: string): Promise<DetectedKeyPoint | null>;
}

/** Ignore very short utterances (greetings, "ok", "yeah") before calling the LLM. */
const MIN_WORDS = 4;

/**
 * AI-driven detector: the model decides, per utterance, whether a groundable
 * key point was raised and names the topic itself — no predefined intents.
 */
class AiKeyPointDetector implements KeyPointDetector {
  readonly name = 'ai';

  constructor(private readonly client: AzureOpenAI) {}

  async detect(utterance: string, context: string): Promise<DetectedKeyPoint | null> {
    if (utterance.trim().split(/\s+/).length < MIN_WORDS) return null;

    const completion = await this.client.chat.completions.create({
      model: env.openAiDeployment,
      temperature: 0,
      max_tokens: 100,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: KEYPOINT_SYSTEM },
        {
          role: 'user',
          content: `CONTEXT (recent lines):\n${context || '(none)'}\n\nLATEST customer line:\n${utterance}\n\nReturn the JSON.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { isKeyPoint?: boolean; topic?: string; query?: string };
      if (!parsed.isKeyPoint || !parsed.topic?.trim() || !parsed.query?.trim()) return null;
      return { topic: parsed.topic.trim(), query: parsed.query.trim() };
    } catch {
      debug.warn('intent', 'key-point JSON parse failed', { raw });
      return null;
    }
  }
}

/**
 * Keyword fallback used when Azure OpenAI isn't configured, so the app still
 * surfaces key notes offline. Reuses the legacy intent keywords as the topic.
 */
class KeywordKeyPointDetector implements KeyPointDetector {
  readonly name = 'keyword';
  private readonly intents = new IntentDetector();

  async detect(utterance: string): Promise<DetectedKeyPoint | null> {
    const intent = this.intents.detect(utterance);
    return intent ? { topic: intent, query: utterance } : null;
  }
}

/** Pick the AI detector when OpenAI is configured, else the keyword fallback. */
export function createKeyPointDetector(): KeyPointDetector {
  if (isOpenAiConfigured()) {
    debug.gauge('keypoint.detector', 'ai');
    return new AiKeyPointDetector(
      new AzureOpenAI({
        endpoint: env.openAiEndpoint,
        apiKey: env.openAiKey,
        apiVersion: env.openAiApiVersion,
        deployment: env.openAiDeployment,
      }),
    );
  }
  debug.gauge('keypoint.detector', 'keyword');
  return new KeywordKeyPointDetector();
}
