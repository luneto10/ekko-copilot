import type { ComponentType } from 'react';

export interface PanelDefinition {
  id: string;
  Component: ComponentType;
  grow?: boolean;
}
