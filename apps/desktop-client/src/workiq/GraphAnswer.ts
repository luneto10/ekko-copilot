import type { AzureOpenAI } from 'openai';

interface GraphAnswerDeps {
  openai?: AzureOpenAI | null;
  deployment?: string;
}

export async function answerFromSnippets(
  deps: GraphAnswerDeps,
  question: string,
  snippets: string[],
): Promise<string> {
  if (snippets.length === 0) {
    return 'No matching documents were found in your Microsoft 365 content for this query.';
  }
  if (!deps.openai || !deps.deployment) {
    return snippets.slice(0, 3).join('\n\n');
  }

  const completion = await deps.openai.chat.completions.create({
    model: deps.deployment,
    temperature: 0.2,
    max_tokens: 110,
    messages: [
      {
        role: 'system',
        content:
          'You are a real-time sales copilot and response coach. Answer the rep in AT MOST ' +
          '2 short sentences (or up to 3 terse bullets) using ONLY the provided snippets. ' +
          'If the rep asks whether a response is good or what to say next, give a better ' +
          'customer-facing response, not just a fact dump. If the customer is frustrated, ' +
          'angry, confused, or profane, de-escalate first: acknowledge, answer plainly if ' +
          'grounded, and offer a calm next step. No preamble, no filler, no invented facts.',
      },
      {
        role: 'user',
        content: `Question: ${question}\n\nSnippets:\n${snippets
          .slice(0, 5)
          .map((snippet, index) => `[${index + 1}] ${snippet}`)
          .join('\n\n')}`,
      },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() || snippets[0];
}