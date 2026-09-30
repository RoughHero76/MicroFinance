// P-04: a light tap on success, a short buzz on errors. Uses the built-in
// Vibration API (no extra native library).

import { Vibration } from 'react-native';

export const haptics = {
  success: () => Vibration.vibrate(12),
  warning: () => Vibration.vibrate([0, 20, 60, 20]),
  error: () => Vibration.vibrate([0, 30, 50, 30]),
  tap: () => Vibration.vibrate(6),
};
