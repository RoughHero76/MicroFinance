// On a wide window the sidebar (WebShell) replaces the bottom tab bar.

import React from 'react';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useBreakpoint} from '@/lib/useBreakpoint';
import {FloatingTabBar} from './TabBar';

export function AppTabBar(props: BottomTabBarProps) {
  const {wide} = useBreakpoint();
  return wide ? null : <FloatingTabBar {...props} />;
}
