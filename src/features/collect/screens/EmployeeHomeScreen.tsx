// E1 employee Home. Keeps every card from today: today's collections,
// customers, leads, create lead (+), NPA and SMA 0/1/2 (as chips, U-17).
// All numbers come from one call (BE-2).

import React from 'react';
import {Pressable, RefreshControl, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {formatMoney} from '@/lib/format';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {NotificationBell} from '@/features/notifications/Bell';
import {makeStyles} from '@/theme';
import {Card, Chips, ErrorState, Icon, IconButton, OfflineBanner, ProgressBar, Screen, Skeleton, Text} from '@/ui';
import {collectKeys, getEmployeeDashboard, type OverdueBucket} from '../api';

export default function EmployeeHomeScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {user} = useSession();
  const can = useCan();
  const query = useQuery({queryKey: collectKeys.dashboard, queryFn: getEmployeeDashboard, meta: {persist: true}});
  const d = query.data;
  const go = (route: string, params?: object) => navigation.navigate(route as never, params as never);

  const total = d ? d.today.amountCollected + d.today.amountDue : 0;
  const progress = total > 0 ? (d?.today.amountCollected ?? 0) / total : 0;

  return (
    <Screen
      header={{
        title: t('home.welcome', {name: user?.fname ?? ''}),
        large: true,
        right: (
          <View style={s.headerActions}>
            <IconButton icon="magnify" label={t('common.search')} variant="plain" onPress={() => go('Search')} />
            <NotificationBell />
          </View>
        ),
      }}
      scroll
      banner={<OfflineBanner savedAt={query.dataUpdatedAt} />}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}>
      {query.isError && !d ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : (
        <>
          <Card onPress={() => go('Collect')} style={s.hero} accessibilityLabel={t('home.todaysCollections')}>
            <View style={s.heroHead}>
              <Text variant="overline" color="muted">
                {t('home.todaysCollections')}
              </Text>
              <Icon name="chevron-right" size={20} color="muted" />
            </View>
            {d ? (
              <>
                <Text variant="display" tabular>
                  {t('home.dueCount', {count: d.today.dueCount})}
                </Text>
                <Text color="muted" tabular>
                  {t('home.collectedOf', {collected: formatMoney(d.today.amountCollected), total: formatMoney(total)})}
                </Text>
                <ProgressBar value={progress} tone="success" style={s.progress} />
              </>
            ) : (
              <>
                <Skeleton width={120} height={34} />
                <Skeleton width="70%" style={s.gap} />
              </>
            )}
          </Card>

          <View style={s.tiles}>
            <Card onPress={() => go('Customers')} style={s.tile}>
              <Icon name="account-group-outline" size={22} color="primary" />
              <Text variant="small" color="muted">
                {t('home.myCustomers')}
              </Text>
              <Text variant="h2" tabular>
                {d ? d.customersCount : '–'}
              </Text>
            </Card>
            {can('lead.create') ? (
              <Card onPress={() => go('Leads')} style={s.tile}>
                <View style={s.tileHead}>
                  <Icon name="account-search-outline" size={22} color="primary" />
                  <Pressable
                    onPress={() => go('NewLead')}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.newLead')}
                    style={s.plus}>
                    <Icon name="plus" size={18} color="onPrimary" />
                  </Pressable>
                </View>
                <Text variant="small" color="muted">
                  {t('home.leads')}
                </Text>
                <Text variant="h2" tabular>
                  {d ? d.leads.total : '–'}
                </Text>
              </Card>
            ) : null}
          </View>

          <Card style={s.overdue}>
            <Pressable onPress={() => go('Overdue', {bucket: 'all'})} style={s.overdueHead} accessibilityRole="button">
              <View style={s.flex}>
                <Text variant="title">{t('home.myOverdue')}</Text>
                {d ? (
                  <Text variant="small" color="muted" tabular>
                    {t('home.overdueTotal', {amount: formatMoney(d.overdue.totalOverdue)})}
                  </Text>
                ) : null}
              </View>
              <Text variant="h1" color={d && d.overdue.loans > 0 ? 'danger' : 'text'} tabular>
                {d ? d.overdue.loans : '–'}
              </Text>
            </Pressable>
            <Chips<OverdueBucket>
              wrap
              options={[
                {value: 'sma0', label: t('status.risk.sma0'), count: d?.overdue.sma0 ?? 0},
                {value: 'sma1', label: t('status.risk.sma1'), count: d?.overdue.sma1 ?? 0},
                {value: 'sma2', label: t('status.risk.sma2'), count: d?.overdue.sma2 ?? 0},
                {value: 'npa', label: t('status.risk.npa'), count: d?.overdue.npa ?? 0},
              ]}
              value={null}
              onChange={bucket => go('Overdue', {bucket})}
              style={s.gap}
            />
          </Card>
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  headerActions: {flexDirection: 'row', alignItems: 'center'},
  hero: {gap: t.space.xs, padding: t.space.lg},
  heroHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  progress: {marginTop: t.space.sm},
  gap: {marginTop: t.space.sm},
  tiles: {flexDirection: 'row', gap: 10, marginTop: t.space.md},
  tile: {flex: 1, gap: t.space.xs, padding: t.space.md},
  tileHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  plus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdue: {marginTop: t.space.md, padding: t.space.lg},
  overdueHead: {flexDirection: 'row', alignItems: 'center', gap: t.space.md},
  flex: {flex: 1},
}));
