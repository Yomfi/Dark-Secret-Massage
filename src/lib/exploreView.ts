import { useEffect, useState } from 'react';

/** Provider discovery layouts supported by the Explore page. */
export type ExploreView = 'grid' | 'list';

export const EXPLORE_VIEW_STORAGE_KEY = 'ms.explore.view';

/** Grid is the default for every fresh visitor, on every screen size. */
const DEFAULT_EXPLORE_VIEW: ExploreView = 'grid';

export function readExploreView(): ExploreView {
  if (typeof window === 'undefined') return DEFAULT_EXPLORE_VIEW;
  try {
    return window.localStorage.getItem(EXPLORE_VIEW_STORAGE_KEY) === 'list' ? 'list' : DEFAULT_EXPLORE_VIEW;
  } catch {
    return DEFAULT_EXPLORE_VIEW;
  }
}

export function writeExploreView(view: ExploreView): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EXPLORE_VIEW_STORAGE_KEY, view);
  } catch {
    // Private-mode or blocked storage: the layout still works for this session.
  }
}

/** Layout preference remembered across navigation and reloads. */
export function useExploreViewPreference() {
  const [view, setView] = useState<ExploreView>(readExploreView);

  useEffect(() => {
    writeExploreView(view);
  }, [view]);

  return [view, setView] as const;
}
