import type { SpeakerId, WorkIqSourceKind } from '@workiq/types';

/**
 * Central design tokens for the widget.
 *
 * Change a colour / label / icon once here and every panel updates (DRY). Keep
 * presentational constants in this file rather than scattering Tailwind class
 * strings or emoji across components.
 */

/** Tailwind text-colour class per speaker, used by the Live Feed. */
export const SPEAKER_COLOR: Record<SpeakerId, string> = {
  Speaker_1: 'text-sky-300',
  Speaker_2: 'text-violet-300',
};

/** Human-friendly speaker name, used when a segment lacks an explicit label. */
export const SPEAKER_LABEL: Record<SpeakerId, string> = {
  Speaker_1: 'Sales Rep',
  Speaker_2: 'Customer',
};

/** Emoji shown on a Work IQ source chip, keyed by the source kind. */
export const SOURCE_ICON: Record<WorkIqSourceKind, string> = {
  sharepoint: '📁',
  email: '✉️',
  teams: '💬',
  document: '📄',
};

/**
 * Shared "glass" surface classes so panels look consistent.
 *
 * Background colour comes from the `--surface-bg` CSS variable (see
 * `globals.css`), which the header's solid/transparent toggle flips for the
 * whole widget at once.
 */
export const GLASS_SURFACE = 'glass-surface rounded-2xl border border-white/10';
