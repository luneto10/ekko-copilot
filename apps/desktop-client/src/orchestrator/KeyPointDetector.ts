import { AzureOpenAI } from 'openai';
import { env, isOpenAiConfigured } from '../env';
import { debug } from '../debug/DebugBus';
import { KEYPOINT_SYSTEM } from './prompts';
import { IntentDetector } from './IntentDetector';

export interface DetectedKeyPoint {
  topic: string;
  query: string;
}

export interface KeyPointDetector {
  readonly name: string;
  detect(
    utterance: string,
    context: string,
    knownTopics: string[],
  ): Promise<DetectedKeyPoint | null>;
}

const MIN_WORDS = 4;

class AiKeyPointDetector implements KeyPointDetector {
  readonly name = 'ai';

  constructor(private readonly client: AzureOpenAI) {}

  async detect(
    utterance: string,
    context: string,
    knownTopics: string[],
  ): Promise<DetectedKeyPoint | null> {
    if (utterance.trim().split(/\s+/).length < MIN_WORDS) return null;

    const existing = knownTopics.length
      ? `EXISTING topics already on the board: ${knownTopics.map((t) => `"${t}"`).join(', ')}.\n` +
        'If this point is about one of them, REUSE that exact label as the topic.\n\n'
      : '';

    const completion = await this.client.chat.completions.create({
      model: env.openAiDeployment,
      temperature: 0,
      max_tokens: 100,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: KEYPOINT_SYSTEM },
        {
          role: 'user',
          content: `${existing}CONTEXT (recent lines):\n${context || '(none)'}\n\nLATEST customer line:\n${utterance}\n\nReturn the JSON.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    return parseKeyPoint(raw);
  }
}

class KeywordKeyPointDetector implements KeyPointDetector {
  readonly name = 'keyword';
  private readonly intents = new IntentDetector();

  async detect(utterance: string): Promise<DetectedKeyPoint | null> {
    const intent = this.intents.detect(utterance);
    return intent ? { topic: intent, query: utterance } : null;
  }
}

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

function parseKeyPoint(raw: string | undefined): DetectedKeyPoint | null {
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
