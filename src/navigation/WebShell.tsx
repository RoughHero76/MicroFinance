// Phone: nothing around the navigator. The web version (WebShell.web.tsx)
// adds the sidebar on wide windows.

import React from 'react';
import type {NavigationContainerRef} from '@react-navigation/native';

export function WebShell({children}: {navRef: React.RefObject<NavigationContainerRef<any>>; children: React.ReactNode}) {
  return <>{children}</>;
}
