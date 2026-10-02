// W7: animate the next layout change, e.g. a row leaving a list after
// Approve or coming back after Undo. Neighbouring rows slide into place
// instead of jumping. Only call it right before a change you trigger
// yourself (a local cache update), so it never animates something else.

import {LayoutAnimation, Platform, UIManager} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function animateNextLayout() {
  LayoutAnimation.configureNext({
    duration: 260,
    create: {type: 'easeInEaseOut', property: 'opacity'},
    update: {type: 'spring', springDamping: 0.85},
    delete: {type: 'easeOut', property: 'opacity', duration: 160},
  });
}
