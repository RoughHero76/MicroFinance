// `react-native` on the web: everything react-native-web has, plus harmless
// stand-ins for the few phone-only APIs the app names in files that only
// run on the phone, so a missing export never breaks the bundle.

import type React from 'react';
import * as ReactDOM from 'react-dom';
import * as RNW from 'react-native-web';

export * from 'react-native-web';
export default RNW;

export const PermissionsAndroid = {
  PERMISSIONS: {} as Record<string, string>,
  RESULTS: {GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again'},
  check: async () => true,
  request: async () => 'granted',
};

export const ToastAndroid = {
  SHORT: 0,
  LONG: 1,
  show: () => undefined,
};

// react-native-web 0.21 throws here, but gesture-handler (GestureDetector,
// the photo viewer's pinch and pan) still calls it to find the element to
// listen on. This is what react-native-web 0.19 did: the element behind a
// component.
export function findNodeHandle(component: unknown): Element | Text | null {
  if (component == null) return null;
  if (component instanceof Element) return component;
  // React 18 still has it; the types for the next React no longer list it.
  const {findDOMNode} = ReactDOM as unknown as {findDOMNode: (c: React.ReactInstance) => Element | Text | null};
  return findDOMNode(component as React.ReactInstance);
}
