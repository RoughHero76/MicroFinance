// True once the screen's push animation has finished (native-stack's
// transitionEnd). Heavy screens wait for it so building them doesn't drop
// frames from the slide-in. Falls back to a short timer for screens shown
// without a transition.

import {useEffect, useState} from 'react';
import {useNavigation} from '@react-navigation/native';

const FALLBACK_MS = 450;

export function useTransitionDone(skip = false): boolean {
  const navigation = useNavigation();
  const [done, setDone] = useState(skip);
  useEffect(() => {
    if (skip || done) {
      return;
    }
    const finish = () => setDone(true);
    // transitionEnd exists on stack navigators only; the cast keeps this
    // hook usable from any screen.
    const unsubscribe = navigation.addListener('transitionEnd' as never, finish);
    const timer = setTimeout(finish, FALLBACK_MS);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [navigation, skip, done]);
  return done;
}
