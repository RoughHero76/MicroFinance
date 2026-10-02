// Shared pieces of the role navigators (F-8): the themed tab bar, header
// options for the old screens, and the screens both roles open on top of
// the tabs.

import React from 'react';
import type {BottomTabNavigationOptions} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationOptions} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import type {Theme} from '@/theme';
import {Icon, IconButton} from '@/ui';

export interface TabConfig<Name extends string> {
  name: Name;
  label: string;
  icon: string;
  iconFocused: string;
  component: React.ComponentType<any>;
  /** New screens draw their own header; `false` hides the navigator's. */
  header?: {title: string; right?: HeaderAction[]} | false;
  badge?: number;
  visible?: boolean;
}

export interface HeaderAction {
  icon: string;
  label: string;
  route: string;
}

function HeaderActions({actions}: {actions: HeaderAction[]}) {
  const navigation = useNavigation();
  return (
    <>
      {actions.map(action => (
        <IconButton
          key={action.route}
          icon={action.icon}
          label={action.label}
          variant="plain"
          onPress={() => navigation.navigate(action.route as never)}
        />
      ))}
    </>
  );
}

export function tabScreenOptions(t: Theme): BottomTabNavigationOptions {
  return {
    tabBarActiveTintColor: t.colors.primary,
    tabBarInactiveTintColor: t.colors.muted,
    tabBarStyle: {
      backgroundColor: t.colors.surface,
      borderTopColor: t.colors.border,
      height: 60,
      paddingBottom: 8,
      paddingTop: 6,
    },
    tabBarLabelStyle: {fontSize: 11, fontWeight: '600'},
    headerStyle: {backgroundColor: t.colors.surface},
    headerTitleStyle: {color: t.colors.text, fontWeight: '600'},
    headerShadowVisible: false,
    tabBarHideOnKeyboard: true,
  };
}

export function tabOptions<N extends string>(tab: TabConfig<N>): BottomTabNavigationOptions {
  return {
    title: tab.label,
    tabBarLabel: tab.label,
    tabBarAccessibilityLabel: tab.label,
    tabBarBadge: tab.badge ? (tab.badge > 99 ? '99+' : tab.badge) : undefined,
    tabBarIcon: ({focused, color}) => <Icon name={focused ? tab.iconFocused : tab.icon} size={24} color={color} />,
    headerShown: !!tab.header,
    headerTitle: tab.header ? tab.header.title : undefined,
    headerRight:
      tab.header && tab.header.right
        ? () => <HeaderActions actions={(tab.header as {right: HeaderAction[]}).right} />
        : undefined,
  };
}

export function stackScreenOptions(t: Theme): NativeStackNavigationOptions {
  return {
    headerShown: false,
    headerStyle: {backgroundColor: t.colors.surface},
    headerTintColor: t.colors.text,
    headerTitleStyle: {color: t.colors.text},
    headerShadowVisible: false,
    contentStyle: {backgroundColor: t.colors.bg},
    // Android's own slide takes 400 ms and felt like slow motion; the
    // iOS-style one is 200 ms with a smooth ease and a slight parallax.
    animation: 'ios',
  };
}
