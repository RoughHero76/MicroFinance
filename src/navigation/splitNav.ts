// The small "navigator" behind the web split view: which detail screens are
// open in the right-hand pane. Kept apart from the component so it can be
// tested without a browser.

import type React from 'react';

/** Detail screens a list can open beside itself, by route name. */
export type DetailScreens = Record<string, React.ComponentType<any>>;

export interface PaneEntry {
  key: string;
  name: string;
  params: unknown;
}

let counter = 0;
const entry = (name: string, params: unknown): PaneEntry => ({key: `pane-${++counter}`, name, params});

/** A row tapped in the list: the pane starts over with that detail. */
export function openFromList(_stack: PaneEntry[], name: string, params: unknown): PaneEntry[] {
  return [entry(name, params)];
}

/** A link inside a detail (customer → loan): one more screen on top. */
export function pushInPane(stack: PaneEntry[], name: string, params: unknown): PaneEntry[] {
  const top = stack[stack.length - 1];
  // The same screen again (a refresh of params) replaces instead of piling up.
  if (top && top.name === name) return [...stack.slice(0, -1), entry(name, params)];
  return [...stack, entry(name, params)];
}

export function popPane(stack: PaneEntry[]): PaneEntry[] {
  return stack.slice(0, -1);
}

export function setTopParams(stack: PaneEntry[], params: unknown): PaneEntry[] {
  if (!stack.length) return stack;
  const top = stack[stack.length - 1];
  return [...stack.slice(0, -1), {...top, params: {...(top.params as object), ...(params as object)}}];
}
