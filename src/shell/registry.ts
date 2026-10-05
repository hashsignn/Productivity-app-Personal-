// Feature panels register themselves by living in src/features/<name>/index.tsx.
// Each one default-exports a React component and may export `meta`:
//
//   export const meta: FeatureMeta = { title: "Study", icon: "📚", order: 20, placement: "side" };
//   export default function Study() { const { date } = useApp(); ... }
//
// No shell edits are needed to add a panel.

import type { ComponentType, ReactNode } from "react";

export interface FeatureMeta {
  title: string;
  icon: ReactNode;
  /** Lower comes first in the rail. Today is 0. */
  order?: number;
  /**
   * "main" panels replace the main view. "side" panels open next to it
   * (the window widens to make room), good for study tools.
   */
  placement?: "main" | "side";
}

export interface Feature extends Required<FeatureMeta> {
  id: string;
  Component: ComponentType;
}

interface FeatureModule {
  default: ComponentType;
  meta?: FeatureMeta;
}

const modules = import.meta.glob<FeatureModule>("../features/*/index.tsx", { eager: true });

export const FEATURES: Feature[] = Object.entries(modules)
  .map(([path, mod]) => {
    const id = path.split("/").at(-2)!;
    const meta = mod.meta ?? { title: id, icon: "•" };
    return {
      id,
      Component: mod.default,
      title: meta.title,
      icon: meta.icon,
      order: meta.order ?? 100,
      placement: meta.placement ?? "main",
    };
  })
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
