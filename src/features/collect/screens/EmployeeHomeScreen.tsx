// E1 employee Home (mock E1). Keeps every card from today: today's
// collections, customers, leads, create lead (+), NPA and SMA 0/1/2.
// W7: the gradient hero, compact count tiles and one small tile per overdue
// level, as drawn in the mock. All numbers come from one call (BE-2).

import React from 'react';
import {RefreshControl, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {formatMoney} from '@/lib/format';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {NotificationBell} from '@/features/notifications/Bell';
import {makeStyles} from '@/theme';
import {
  Appear,
  Card,
  CountUp,
  ErrorState,
  HeroCard,
  Icon,
  IconButton,
  OfflineBanner,
  ProgressBar,
  Screen,
  Skeleton,
  Text,
  type TextColor,
} from '@/ui';
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

  const levels: {bucket: OverdueBucket; label: string; count?: number; color: TextColor}[] = [
    {bucket: 'sma0', label: t('status.risk.sma0'), count: d?.overdue.sma0, color: 'warning'},
    {bucket: 'sma1', label: t('status.risk.sma1'), count: d?.overdue.sma1, color: 'warning'},
    {bucket: 'sma2', label: t('status.risk.sma2'), count: d?.overdue.sma2, color: 'danger'},
    {bucket: 'npa', label: t('status.risk.npa'), count: d?.overdue.npa, color: 'danger'},
  ];

  return (
    <Screen
      header={{
        title: t('home.welcome', {name: user?.fname ?? ''}),
        logo: true,
        large: true,
        right: (
          <View style={s.headerActions}>
            <IconButton icon="magnify" label={t('common.search')} variant="outline" onPress={() => go('Search')} />
            <NotificationBell variant="outline" />
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
          {user?.fname ? (
            <Appear>
              <Text variant="h2" weight="bold" style={s.greeting}>
                {t('home.welcome', {name: user.fname})}
              </Text>
            </Appear>
          ) : null}

          <Appear index={1}>
            <HeroCard onPress={() => go('Collect')} accessibilityLabel={t('home.todaysCollections')}>
              <View style={s.heroHead}>
                <Text variant="small" color="onPrimary" style={s.heroMuted}>
                  {t('home.todaysCollections')}
                </Text>
                <Icon name="chevron-right" size={20} color="onPrimary" />
              </View>
              {d ? (
                <>
                  <Text variant="display" weight="bold" color="onPrimary" tabular style={s.heroFigure}>
                    {t('home.dueCount', {count: d.today.dueCount})}
                  </Text>
                  <Text variant="small" color="onPrimary" tabular style={s.heroMuted}>
                    {t('home.collectedOf', {
                      collected: formatMoney(d.today.amountCollected),
                      total: formatMoney(total),
                    })}
                  </Text>
                  <ProgressBar value={progress} onHero style={s.progress} />
                </>
              ) : (
                <View style={s.heroSkeleton}>
                  <Skeleton width={120} height={34} />
                  <Skeleton width="70%" />
                </View>
              )}
            </HeroCard>
          </Appear>

          <Appear index={2} style={s.tiles}>
            <Card onPress={() => go('Customers')} style={s.tile} accessibilityLabel={t('home.myCustomers')}>
              <Text variant="small" color="muted" numberOfLines={1} style={s.flex}>
                {t('home.myCustomers')}
              </Text>
              {d ? <CountUp value={d.customersCount} variant="bodyLg" weight="bold" /> : <Skeleton width={24} />}
            </Card>
            {can('lead.create') ? (
              <Card onPress={() => go('Leads')} style={s.tile} accessibilityLabel={t('home.leads')}>
                <Text variant="small" color="muted" numberOfLines={1} style={s.flex}>
                  {t('home.leads')}
                </Text>
                {d ? <CountUp value={d.leads.total} variant="bodyLg" weight="bold" /> : <Skeleton width={24} />}
                <IconButton
                  icon="plus"
                  label={t('home.newLead')}
                  variant="tonal"
                  size={26}
                  onPress={() => go('NewLead')}
                />
              </Card>
            ) : null}
          </Appear>

          <Appear index={3}>
            <Card padded={false} onPress={() => go('Overdue', {bucket: 'all'})} style={s.overdueHead}>
              <View style={s.flex}>
                <Text variant="bodyLg" weight="bold">
                  {t('home.myOverdue')}
                </Text>
                {d ? (
                  <Text variant="small" color="muted" tabular>
                    {t('home.overdueTotal', {amount: formatMoney(d.overdue.totalOverdue)})}
                  </Text>
                ) : null}
              </View>
              <Text variant="h2" weight="bold" color={d && d.overdue.loans > 0 ? 'danger' : 'text'} tabular>
                {d ? d.overdue.loans : '–'}
              </Text>
              <Icon name="chevron-right" size={20} color="muted" />
            </Card>
          </Appear>

          <Appear index={4} style={s.levels}>
            {levels.map(level => (
              <Card
                key={level.bucket}
                onPress={() => go('Overdue', {bucket: level.bucket})}
                style={s.level}
                accessibilityLabel={`${level.label}: ${level.count ?? 0}`}>
                <Text
                  variant="title"
                  weight="bold"
                  color={level.count ? level.color : 'muted'}
                  tabular
                  numberOfLines={1}>
                  {d ? level.count ?? 0 : '–'}
                </Text>
                <Text variant="caption" color="muted" numberOfLines={1}>
                  {level.label}
                </Text>
              </Card>
            ))}
          </Appear>
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: t.space.sm},
  greeting: {marginBottom: t.space.md},
  heroHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  heroMuted: {opacity: 0.85},
  heroFigure: {marginTop: t.space.xs},
  heroSkeleton: {gap: t.space.sm, marginTop: t.space.sm},
  progress: {marginTop: t.space.md},
  tiles: {flexDirection: 'row', gap: 10, marginTop: t.space.md},
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    minHeight: 48,
    paddingVertical: t.space.sm,
    paddingHorizontal: t.space.md,
  },
  overdueHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    marginTop: t.space.lg,
    padding: t.space.md,
  },
  levels: {flexDirection: 'row', gap: t.space.sm, marginTop: 10},
  level: {flex: 1, alignItems: 'center', gap: 2, paddingVertical: t.space.md, paddingHorizontal: t.space.xs},
  flex: {flex: 1},
}));
