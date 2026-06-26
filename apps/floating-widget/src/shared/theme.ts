import type { SpeakerId, WorkIqSourceKind } from '@workiq/types';

export const SPEAKER_COLOR: Record<SpeakerId, string> = {
  Speaker_1: 'text-sky-300',
  Speaker_2: 'text-violet-300',
};

export const SPEAKER_LABEL: Record<SpeakerId, string> = {
  Speaker_1: 'Sales Rep',
  Speaker_2: 'Customer',
};

export const SOURCE_ICON: Record<WorkIqSourceKind, string> = {
  sharepoint: '📁',
  email: '✉️',
  teams: '💬',
  document: '📄',
};

export const GLASS_SURFACE = 'glass-surface rounded-xl border border-white/10';
