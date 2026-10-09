// Web: on a wide window a list screen and the detail it opens sit side by
// side (the customer list beside a customer, the loan list beside a loan).
// Both are the phone's own screens. The detail runs inside a small
// navigator of its own: links to other details open in the same pane, and
// anything else (the loan form, settings…) opens full screen as usual.

import React, {useCallback, useMemo, useState} from 'react';
import {View} from 'react-native';
import {NavigationContext, NavigationRouteContext, useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useBreakpoint} from '@/lib/useBreakpoint';
import {makeStyles} from '@/theme';
import {Icon, Text} from '@/ui';
import {openFromList, popPane, pushInPane, setTopParams, type DetailScreens, type PaneEntry} from './splitNav';

export type {DetailScreens};

type Nav = ReturnType<typeof useNavigation> & Record<string, any>;

/** The real navigation, with the calls that open a detail answered by the pane. */
function proxyNavigation(real: Nav, overrides: Record<string, unknown>): Nav {
  return new Proxy(real, {
    get(target, prop: string) {
      if (prop in overrides) return overrides[prop];
      const value = (target as any)[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

function SplitHost({
  List,
  details,
  listProps,
}: {
  List: React.ComponentType<any>;
  details: DetailScreens;
  listProps: object;
}) {
  const s = useStyles();
  const {t} = useTranslation();
  const real = useNavigation() as Nav;
  const [stack, setStack] = useState<PaneEntry[]>([]);

  const go = useCallback(
    (from: 'list' | 'pane') =>
      (name: string, params?: unknown) => {
        if (name in details) setStack(cur => (from === 'list' ? openFromList(cur, name, params) : pushInPane(cur, name, params)));
        else real.navigate(name as never, params as never);
      },
    [details, real],
  );

  const listNav = useMemo(() => {
    const open = go('list');
    return proxyNavigation(real, {navigate: open, push: open});
  }, [go, real]);

  const paneNav = useMemo(() => {
    const open = go('pane');
    return proxyNavigation(real, {
      navigate: open,
      push: open,
      replace: open,
      goBack: () => setStack(popPane),
      // The first detail has no back arrow; later ones go back inside the pane.
      canGoBack: () => stack.length > 1,
      setParams: (params: unknown) => setStack(cur => setTopParams(cur, params)),
      setOptions: () => undefined,
    });
  }, [go, real, stack.length]);

  const top = stack[stack.length - 1];
  const Detail = top ? details[top.name] : null;

  return (
    <View style={s.row}>
      <View style={s.list}>
        <NavigationContext.Provider value={listNav as any}>
          <List {...listProps} />
        </NavigationContext.Provider>
      </View>
      <View style={s.pane}>
        {Detail && top ? (
          <NavigationContext.Provider value={paneNav as any}>
            <NavigationRouteContext.Provider value={{key: top.key, name: top.name, params: top.params} as any}>
              <Detail key={top.key} />
            </NavigationRouteContext.Provider>
          </NavigationContext.Provider>
        ) : (
          <View style={s.empty}>
            <Icon name="gesture-tap" size={32} color="muted" />
            <Text color="muted" align="center">
              {t('web.pickOne')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Wraps a list screen: below the split width it is the plain list; above it
 * the detail screens named in `details` open beside it.
 */
export function withSplit<P extends object>(List: React.ComponentType<P>, details: DetailScreens) {
  function WithSplit(props: P) {
    const {split} = useBreakpoint();
    return split ? <SplitHost List={List} details={details} listProps={props} /> : <List {...props} />;
  }
  WithSplit.displayName = `WithSplit(${List.displayName ?? List.name ?? 'List'})`;
  return WithSplit as React.ComponentType<P>;
}

const useStyles = makeStyles(t => ({
  row: {flex: 1, flexDirection: 'row', width: '100%'},
  list: {width: 400, borderRightWidth: 1, borderRightColor: t.colors.border},
  pane: {flex: 1, minWidth: 0},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.space.sm, padding: t.space.xl},
}));
