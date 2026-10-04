// E12 My payments (BE-7) with the end-of-day summary (P-13): "Today: ₹21,300
// · Cash ₹14,200 · Other ₹7,100 · 5 pending approval", so the cash handed
// over can be checked against the app. E-12: payments saved on the phone are
// listed first ("Not sent yet"), and one the server refused shows in red with
// Try again and Remove, since it's money the person is holding.

import React, {useMemo, useState} from 'react';
import {FlatList, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {formatDateTime, formatMoney, toISODate} from '@/lib/format';
import {useInfiniteList, type Page} from '@/lib/useInfiniteList';
import {collectKeys, getMyPaymentsPage, type MyPaymentsSummary} from '@/features/collect/api';
import {sendQueued} from '@/features/collect/PayQueueSync';
import {flushQueue, removeQueued, retryQueued, usePayQueue, type QueuedPayment} from '@/features/collect/payQueue';
import type {Repayment} from '@/features/loans/types';
import {makeStyles} from '@/theme';
import {
  Avatar,
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  ListRow,
  OfflineBanner,
  Screen,
  SegmentedControl,
  SkeletonRows,
  StatusBadge,
  Text,
  useConfirm,
  listProps,
  useListEntrance,
  RefreshControl,
} from '@/ui';

type Range = 'today' | 'week' | 'month';

function rangeDates(range: Range) {
  const now = new Date();
  const from = new Date(now);
  if (range === 'week') from.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  if (range === 'month') from.setDate(1);
  return {from: toISODate(from), to: toISODate(now)};
}

export default function MyPaymentsScreen() {
  const s = useStyles();
  const entering = useListEntrance();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const navigation = useNavigation();
  const [range, setRange] = useState<Range>('today');
  const dates = useMemo(() => rangeDates(range), [range]);
  const [summary, setSummary] = useState<MyPaymentsSummary | null>(null);
  const confirm = useConfirm();
  const queue = usePayQueue();
  const waiting = queue.filter(p => p.state === 'waiting');
  const refused = queue.filter(p => p.state === 'refused');

  const retry = async (payment: QueuedPayment) => {
    retryQueued(payment.clientRef);
    if (await flushQueue(sendQueued)) list.refresh();
  };
  const askRemove = (payment: QueuedPayment) =>
    confirm.ask({
      title: t('payQueue.removeTitle'),
      message: t('payQueue.removeHint', {amount: formatMoney(payment.amount), loan: payment.loanNumber}),
      confirmLabel: t('payQueue.remove'),
      destructive: true,
      onConfirm: () => removeQueued(payment.clientRef),
    });

  const queuedRow = (payment: QueuedPayment) => (
    <ListRow
      key={payment.clientRef}
      left={<Avatar name={payment.customerName} />}
      title={payment.customerName || `#${payment.loanNumber}`}
      value={formatMoney(payment.amount)}
      subtitle={[
        `#${payment.loanNumber}`,
        t(`enums.paymentMethod.${payment.paymentMethod}`),
        formatDateTime(payment.collectedAt, lang),
      ].join(' · ')}
      badge={
        payment.state === 'refused' ? undefined : <StatusBadge tone="warning" label={t('payQueue.notSent')} />
      }
      meta={payment.state === 'refused' ? payment.error : undefined}
      card
    />
  );

  const list = useInfiniteList<Page<Repayment>>({
    queryKey: collectKeys.mine(`${range}:${dates.from}`),
    fetchPage: async page => {
      const res = await getMyPaymentsPage(page, dates);
      if (page === 1) setSummary(res.summary);
      return res;
    },
    persist: range === 'today',
  });

  const renderItem = ({item}: {item: Repayment}) => {
    const loan = typeof item.loan === 'object' ? item.loan : undefined;
    const c = loan?.customer;
    const name = c ? `${c.fname ?? ''} ${c.lname ?? ''}`.trim() : '';
    return (
      <ListRow
        left={<Avatar name={name} uri={c?.profilePic} />}
        title={name || `#${loan?.loanNumber ?? ''}`}
        value={formatMoney(item.amount)}
        subtitle={[
          loan?.loanNumber ? `#${loan.loanNumber}` : null,
          t(`enums.paymentMethod.${item.paymentMethod}`),
          formatDateTime(item.paymentDate, lang),
        ]
          .filter(Boolean)
          .join(' · ')}
        badge={<StatusBadge set="repayment" status={item.status} />}
        onPress={loan?._id ? () => navigation.navigate('Loan' as never, {loanId: loan._id} as never) : undefined}
        card
      />
    );
  };

  return (
    <Screen
      header={{title: t('myPayments.title')}}
      padded={false}
      banner={<OfflineBanner savedAt={list.dataUpdatedAt} />}>
      <View style={s.top}>
        <SegmentedControl<Range>
          options={[
            {value: 'today', label: t('myPayments.today')},
            {value: 'week', label: t('myPayments.week')},
            {value: 'month', label: t('myPayments.month')},
          ]}
          value={range}
          onChange={setRange}
        />
        {summary ? (
          <Card style={s.summary}>
            <Text variant="h2" tabular>
              {formatMoney(summary.total)}
            </Text>
            <Text variant="small" color="muted" tabular>
              {t('myPayments.split', {cash: formatMoney(summary.cash), other: formatMoney(summary.other)})}
            </Text>
            {waiting.length ? (
              <Text variant="small" color="warning">
                {t('payQueue.notSentCount', {count: waiting.length})}
              </Text>
            ) : null}
            {summary.pending ? (
              <Text variant="small" color="warning">
                {t('myPayments.pendingCount', {count: summary.pending})}
              </Text>
            ) : null}
          </Card>
        ) : null}
        {refused.length ? (
          <Card style={s.refused}>
            <Text variant="bodyLg" weight="bold" color="danger">
              {t('payQueue.refusedTitle', {count: refused.length})}
            </Text>
            <Text variant="small" color="muted">
              {t('payQueue.refusedHint')}
            </Text>
            {refused.map(payment => (
              <View key={payment.clientRef}>
                {queuedRow(payment)}
                <View style={s.refusedActions}>
                  <Button title={t('payQueue.remove')} variant="text" onPress={() => askRemove(payment)} />
                  <Button title={t('payQueue.retry')} variant="secondary" onPress={() => retry(payment)} />
                </View>
              </View>
            ))}
          </Card>
        ) : null}
        {waiting.map(queuedRow)}
      </View>
      {list.isLoading ? (
        <SkeletonRows count={6} />
      ) : list.isError ? (
        <ErrorState error={list.error} what={t('myPayments.title')} onRetry={list.refetch} />
      ) : (
        <FlatList
          {...listProps}
          data={list.items}
          keyExtractor={item => item._id}
          renderItem={info => <Animated.View entering={entering(info.index)}>{renderItem(info)}</Animated.View>}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
          ListFooterComponent={list.isLoadingMore ? <SkeletonRows count={1} /> : null}
          ListEmptyComponent={
            <EmptyState icon="cash-multiple" title={t('myPayments.empty')} message={t('myPayments.emptyHint')} />
          }
        />
      )}
      <ConfirmSheet ref={confirm.ref} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  top: {paddingHorizontal: t.space.lg, gap: t.space.md, marginBottom: t.space.md},
  summary: {gap: t.space.xs},
  refused: {gap: t.space.xs, borderColor: t.colors.danger},
  refusedActions: {flexDirection: 'row', justifyContent: 'flex-end', gap: t.space.sm},
  list: {paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, flexGrow: 1},
}));
