// Browsers have no system haptics; the same calls do nothing.

export const haptics = {
  success: () => undefined,
  warning: () => undefined,
  error: () => undefined,
  tap: () => undefined,
};
