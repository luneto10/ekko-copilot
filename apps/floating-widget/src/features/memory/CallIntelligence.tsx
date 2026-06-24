import Markdown from 'react-markdown';
import { Panel } from '@/shared/ui/Panel';
import { useMemory } from './useMemory';

/**
 * Call Intelligence panel — renders the live `memory.md` (the LLM-maintained
 * CRM note) as Markdown. Styling for headings/bullets lives in `.prose-copilot`
 * (see `globals.css`).
 */
export function CallIntelligence() {
  const markdown = useMemory();

  return (
    <Panel title="Call Intelligence" bodyClassName="prose-copilot text-sm text-slate-200">
      <Markdown>{markdown || '_No insights yet._'}</Markdown>
    </Panel>
  );
}
