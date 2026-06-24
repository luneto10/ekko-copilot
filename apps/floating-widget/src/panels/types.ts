import type { ComponentType } from 'react';

/**
 * A widget panel = one self-contained feature.
 *
 * The `Component` pulls its own data via its feature hook (e.g. `useTranscript`),
 * so the layout never has to thread props through. This keeps features
 * independent: adding or removing one touches only its folder + the registry.
 */
export interface PanelDefinition {
  /** Stable identifier (React key, and handy for feature flags / analytics). */
  id: string;
  /** Self-contained panel component — renders itself, takes no props. */
  Component: ComponentType;
  /**
   * When `true`, the panel flex-grows to share the available vertical space
   * (e.g. Live Feed, Call Intelligence). When omitted, it sizes to its content
   * (e.g. the Copilot recommendation box).
   */
  grow?: boolean;
}
