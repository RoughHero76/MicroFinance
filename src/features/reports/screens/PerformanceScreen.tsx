// M-10 Collection performance by employee (Reports → By employee): amount
// due vs collected, % collected and overdue loans per employee, for this
// month or last month, sortable.

import React, {useState} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {formatMoney} from '@/lib/format';
import {makeStyles} from '@/theme';
import {
  Avatar,
  Card,
  Chips,
  EmptyState,
  ErrorState,
  ProgressBar,
  Screen,
  SegmentedControl,
  SkeletonRows,
  Text,
  listProps,
} from '@/ui';
import {getPerformance, reportKeys, type PerformanceRow} from '../api';

type Sort = 'percent' | 'collected' | 'overdue';

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function sortRows(rows: PerformanceRow[], by: Sort): PerformanceRow[] {
  const copy = [...rows];
  if (by === 'collected') return copy.sort((a, b) => b.collected - a.collected);
  if (by === 'overdue') return copy.sort((a, b) => b.overdueLoans - a.overdueLoans);
  return copy.sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1));
}

export default function PerformanceScreen() {
  const s = useStyles();
  const {t, i18n} = useTranslation();
  const navigation = useNavigation();
  const now = new Date();
  const months = [now, new Date(now.getFullYear(), now.getMonth() - 1, 1)];
  const [month, setMonth] = useState(monthKey(now));
  const [sort, setSort] = useState<Sort>('percent');
  const query = useQuery({queryKey: reportKeys.performance(month), queryFn: () => getPerformance(month)});
  const monthName = (d: Date) => d.toLocaleDateString(i18n.language === 'hi' ? 'hi-IN' : 'en-IN', {month: 'long'});

  const rows = query.data ? sortRows(query.data.rows, sort) : [];

  return (
    <Screen header={{title: t('performance.title')}} padded={false}>
      <View style={s.top}>
        <Chips
          options={months.map(d => ({value: monthKey(d), label: monthName(d)}))}
          value={month}
          onChange={setMonth}
        />
        <SegmentedControl<Sort>
          options={[
            {value: 'percent', label: t('performance.byPercent')},
            {value: 'collected', label: t('performance.byCollected')},
            {value: 'overdue', label: t('performance.byOverdue')},
          ]}
          value={sort}
          onChange={setSort}
          style={s.sort}
        />
        {query.data?.totals.due ? (
          <Text variant="small" color="muted">
            {t('performance.total', {
              collected: formatMoney(query.data.totals.collected),
              due: formatMoney(query.data.totals.due),
              percent: query.data.totals.percent ?? 0,
            })}
          </Text>
        ) : null}
      </View>
      {query.isPending ? (
        <SkeletonRows count={5} />
      ) : query.isError ? (
        <ErrorState error={query.error} what={t('performance.title')} onRetry={query.refetch} />
      ) : (
        <FlatList
          {...listProps}
          data={rows}
          keyExtractor={r => r.employee._id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}
          renderItem={({item}) => (
            <Card
              style={s.card}
              onPress={() => navigation.navigate('Employee' as never, {uid: item.employee.uid} as never)}
              accessibilityLabel={`${item.employee.name}, ${item.percent ?? 0}%`}>
              <View style={s.head}>
                <Avatar name={item.employee.name} uri={item.employee.profilePic} size={36} />
                <View style={s.text}>
                  <Text variant="body" weight="semibold" numberOfLines={1}>
                    {item.employee.name}
                  </Text>
                  <Text variant="small" color="muted" numberOfLines={2}>
                    {[
                      t('performance.ofDue', {collected: formatMoney(item.collected), due: formatMoney(item.due)}),
                      item.overdueLoans ? t('performance.overdue', {count: item.overdueLoans}) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <Text
                  variant="title"
                  color={
                    item.percent == null
                      ? 'muted'
                      : item.percent >= 90
                      ? 'success'
                      : item.percent >= 70
                      ? 'warning'
                      : 'danger'
                  }>
                  {item.percent == null ? '–' : `${item.percent}%`}
                </Text>
              </View>
              <ProgressBar value={Math.min(1, (item.percent ?? 0) / 100)} style={s.bar} />
            </Card>
          )}
          ListEmptyComponent={<EmptyState icon="account-tie-outline" title={t('performance.empty')} />}
        />
      )}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  top: {paddingHorizontal: t.space.lg, gap: t.space.sm, marginBottom: t.space.sm},
  sort: {marginTop: t.space.xs},
  list: {paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, flexGrow: 1},
  card: {marginBottom: t.space.sm},
  head: {flexDirection: 'row', alignItems: 'center', gap: t.space.md},
  text: {flex: 1, minWidth: 0},
  bar: {marginTop: t.space.sm},
}));
