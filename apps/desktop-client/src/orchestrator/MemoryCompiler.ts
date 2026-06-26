import { AzureOpenAI } from 'openai';
import { env, isOpenAiConfigured } from '../env';
import { MEMORY_SYSTEM, TACTIC_SYSTEM } from './prompts';

export class MemoryCompiler {
  private readonly client: AzureOpenAI | null;

  constructor() {
    this.client = createOpenAiClient();
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
      temperature: 0.15,
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

function createOpenAiClient(): AzureOpenAI | null {
  if (!isOpenAiConfigured()) return null;
  return new AzureOpenAI({
    endpoint: env.openAiEndpoint,
    apiKey: env.openAiKey,
    apiVersion: env.openAiApiVersion,
    deployment: env.openAiDeployment,
  });
}
