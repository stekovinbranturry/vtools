import type { ComponentType } from "react";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  /** Emoji or short glyph shown on the card. */
  icon: string;
  /** Tailwind gradient classes used for the card accent. */
  accent: string;
  /** Whether the tool is ready to use. */
  available: boolean;
  component?: ComponentType;
}
