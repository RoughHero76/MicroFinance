// M-1 Activity: a loan's history (from its ⋯ menu) or the admin's whole
// activity log (More). Every change with who, when and before → after.

import React from 'react';
import {FlatList} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {formatDateTime, formatMoney} from '@/lib/format';
import {useInfiniteList} from '@/lib/useInfiniteList';
import {adminLoanKeys, getActivityPage, type ActivityEntry} from '@/features/loans/adminApi';
import {makeStyles} from '@/theme';
import {EmptyState, ErrorState, Screen, SkeletonRows, Timeline, listProps, RefreshControl} from '@/ui';

function describeChange(entry: ActivityEntry): string | undefined {
  const keys = Object.keys(entry.after ?? {});
  if (!keys.length) return entry.summary;
  return keys
    .map(k => `${k}: ${String((entry.before ?? {})[k] ?? '–')} → ${String((entry.after ?? {})[k] ?? '–')}`)
    .join(' · ');
}

export default function ActivityScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const route = useRoute<RouteProp<{Activity: {loanId?: string; loanNumber?: string}}, 'Activity'>>();
  const loanId = route.params?.loanId;

  const list = useInfiniteList({
    queryKey: adminLoanKeys.activity(loanId ?? 'all'),
    fetchPage: page => getActivityPage({loan: loanId}, page),
  });

  const items = list.items.map(entry => {
    const amount = typeof entry.params?.amount === 'number' ? formatMoney(entry.params.amount as number) : '';
    return {
      key: entry._id,
      title: t(`activity.actions.${entry.action}`, {amount, defaultValue: entry.action}).replace(/ · $/, ''),
      body: describeChange(entry),
      meta: t('activity.by', {
        name: entry.actorName ?? (entry.actorRole === 'system' ? t('activity.system') : t(`common.${entry.actorRole}`)),
        date: formatDateTime(entry.createdAt, lang),
      }),
      tone:
        entry.action.includes('reject') || entry.action.includes('delete')
          ? ('danger' as const)
          : entry.action.includes('approve')
          ? ('success' as const)
          : ('default' as const),
    };
  });

  return (
    <Screen
      header={{title: loanId ? t('activity.loanTitle', {number: route.params?.loanNumber ?? ''}) : t('activity.title')}}
      padded={false}>
      {list.isLoading ? (
        <SkeletonRows count={6} avatar={false} />
      ) : list.isError ? (
        <ErrorState error={list.error} what={t('activity.title')} onRetry={list.refetch} />
      ) : (
        <FlatList
          {...listProps}
          data={[items]}
          keyExtractor={() => 'timeline'}
          renderItem={({item}) => <Timeline items={item} />}
          contentContainerStyle={s.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
          ListFooterComponent={list.isLoadingMore ? <SkeletonRows count={1} avatar={false} /> : null}
          ListEmptyComponent={<EmptyState icon="history" title={t('activity.empty')} />}
        />
      )}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  list: {padding: t.space.lg, flexGrow: 1},
}));
