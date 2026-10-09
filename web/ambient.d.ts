// Types for what the web build adds. `react-dom` normally brings its own;
// these stand in until `npm install` has run on a machine that builds the web.

declare const __APP_VERSION__: string;
declare module '*.css';
declare module 'react-dom/client' {
  import type {ReactNode} from 'react';
  export function createRoot(container: Element): {render(children: ReactNode): void; unmount(): void};
}
declare module 'react-dom' {
  import type {ReactNode, ReactPortal} from 'react';
  export function createPortal(children: ReactNode, container: Element | DocumentFragment): ReactPortal;
}
// react-native-web ships no types; the phone's react-native types describe the same API.
declare module 'react-native-web';
declare module '*.png' {
  const url: string;
  export default url;
}
