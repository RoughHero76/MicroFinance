// Phone: a list opens its detail as a new screen, as always. The web
// version (SplitView.web.tsx) shows the detail beside the list on wide
// screens.

import type React from 'react';
import type {DetailScreens} from './splitNav';

export type {DetailScreens};

export function withSplit<P extends object>(List: React.ComponentType<P>, _details: DetailScreens) {
  return List;
}
