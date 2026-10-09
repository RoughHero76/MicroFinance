// Web only: lets lib code ask the person for a new PIN without knowing
// about screens. The web host (src/web/Hosts.web.tsx) registers the dialog.

type Handler = () => Promise<string | null>;

let handler: Handler | null = null;

export function registerPinPrompt(next: Handler | null) {
  handler = next;
}

/** Shows "choose a PIN"; resolves with the PIN, or null when cancelled. */
export function askNewPin(): Promise<string | null> {
  return handler ? handler() : Promise.resolve(null);
}
