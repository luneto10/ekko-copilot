import Markdown from 'react-markdown';
import { Panel } from '@/shared/ui/Panel';
import { useMemory } from './useMemory';

export function CallIntelligence() {
  const markdown = useMemory();

  return (
    <Panel title="Call Intelligence" bodyClassName="prose-copilot text-sm text-slate-200">
      <Markdown>{markdown || '_No insights yet._'}</Markdown>
    </Panel>
  );
}
