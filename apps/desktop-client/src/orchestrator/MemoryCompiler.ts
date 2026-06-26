import { AzureOpenAI } from 'openai';
import { env, isOpenAiConfigured } from '../env';
import { MEMORY_SYSTEM, TACTIC_SYSTEM } from './prompts';

/**
 * Wraps Azure OpenAI (a fast model like gpt-4o-mini) for two jobs:
 *  - compile(): merge the running memory.md with a fresh transcript block.
 *  - tactic():  generate one real-time sales recommendation.
 * Degrades to no-ops when Azure OpenAI is not configured, so the app still runs.
 */
export class MemoryCompiler {
  private readonly client: AzureOpenAI | null;

  constructor() {
    this.client = isOpenAiConfigured()
      ? new AzureOpenAI({
          endpoint: env.openAiEndpoint,
          apiKey: env.openAiKey,
          apiVersion: env.openAiApiVersion,
          deployment: env.openAiDeployment,
        })
      : null;
  }

  async compile(currentMarkdown: string, transcriptBlock: string): Promise<string> {
    if (!this.client) return currentMarkdown;
    const completion = await this.client.chat.completions.create({
      model: env.openAiDeployment,
      temperature: 0.2,
      messages: [
        { role: 'system', content: MEMORY_SYSTEM },
        {
          role: 'user',
          content: `EXISTING note:\n${currentMarkdown}\n\nNEW transcript block:\n${transcriptBlock}\n\nReturn the full updated note.`,
        },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || currentMarkdown;
  }

  async tactic(
    memoryMarkdown: string,
    recentExchanges: string,
    groundedFacts = '',
  ): Promise<string> {
    if (!this.client) return '';
    const grounded = groundedFacts.trim()
      ? `\n\nGROUNDED FACTS from the rep's documents (the ONLY source for numbers/specifics):\n${groundedFacts}`
      : '';
    const completion = await this.client.chat.completions.create({
      model: env.openAiDeployment,
      temperature: 0.5,
      max_tokens: 120,
      messages: [
        { role: 'system', content: TACTIC_SYSTEM },
        {
          role: 'user',
          content: `CRM memory:\n${memoryMarkdown}${grounded}\n\nMost recent exchanges:\n${recentExchanges}\n\nGive ONE next-move tactic.`,
        },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || '';
  }
}
