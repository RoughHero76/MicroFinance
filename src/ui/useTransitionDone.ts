// True once the screen's push animation has finished (native-stack's
// transitionEnd). Heavy screens wait for it so building them doesn't drop
// frames from the slide-in. Falls back to a short timer for screens shown
// without a transition.

import {useContext, useEffect, useState} from 'react';
import {NavigationContext} from '@react-navigation/native';

const FALLBACK_MS = 450;

export function useTransitionDone(skip = false): boolean {
  // Not useNavigation(): it throws on screens shown before the navigator
  // exists (permissions, lock), which have no transition to wait for.
  const navigation = useContext(NavigationContext);
  const [done, setDone] = useState(skip || !navigation);
  useEffect(() => {
    if (skip || done || !navigation) {
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
