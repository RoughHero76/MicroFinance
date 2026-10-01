// P-04 / W7: crisp system haptics. A tick for taps and switches, distinct
// patterns for success, warning and error. Uses the phone's own effects
// (react-native-haptic-feedback) and respects the user's "touch feedback"
// setting; falls back to a short vibration on phones without them.

import {Platform} from 'react-native';
import HapticFeedback, {type HapticFeedbackTypes} from 'react-native-haptic-feedback';

const options = {enableVibrateFallback: true, ignoreAndroidSystemSettings: false};

function play(type: keyof typeof HapticFeedbackTypes) {
  try {
    HapticFeedback.trigger(type, options);
  } catch {
    // Haptics are a nicety; never let them break an action.
  }
}

export const haptics = {
  success: () => play('notificationSuccess'),
  warning: () => play('notificationWarning'),
  error: () => play('notificationError'),
  /** Tab bar, switches and other small selections. */
  tap: () => play(Platform.OS === 'android' ? 'effectTick' : 'selection'),
};
