import { useEffect, useState } from 'react';
import { bridge } from '@/shared/bridge';

/**
 * Owns the rolling `memory.md` markdown for the Call Intelligence panel.
 * Subscribes to `memory:update` and exposes the latest markdown string.
 */
export function useMemory() {
  const [markdown, setMarkdown] = useState('');

  useEffect(() => bridge.onMemory((memory) => setMarkdown(memory.markdown)), []);

  return markdown;
}
