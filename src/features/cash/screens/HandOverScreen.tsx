// M-3 Hand over cash (employee; optional module, off by default). The cash
// held now (cash payments not yet handed over), today's UPI/bank for the
// record, how many are waiting for approval, the payments included, and one
// button to hand it over. Past handovers below with their status.

import React from 'react';
import {FlatList} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {errorMessage} from '@/lib/api';
import {formatDate, formatDateTime, formatMoney} from '@/lib/format';
import {useInfiniteList} from '@/lib/useInfiniteList';
import {makeStyles} from '@/theme';
import {
  Card,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Fab,
  KeyValueRows,
  ListRow,
  Screen,
  Section,
  SkeletonRows,
  StatusBadge,
  Text,
  toast,
  useConfirm,
  listProps,
  RefreshControl,
} from '@/ui';
import {cashKeys, getHandoversPage, getHolding, handOverCash, type CashHandover} from '../api';

export function handoverTone(status: CashHandover['status']) {
  return status === 'Received' ? 'success' : status === 'Short' ? 'danger' : 'warning';
}

export default function HandOverScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const holding = useQuery({queryKey: cashKeys.holding, queryFn: getHolding});
  const history = useInfiniteList({
    queryKey: cashKeys.list('mine'),
    fetchPage: page => getHandoversPage('employee', '', page),
  });
  const h = holding.data;
  const SHOWN = 3;

  const handOver = useMutation({
    mutationFn: handOverCash,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: cashKeys.all});
      toast.success(t('cash.handedOver', {amount: formatMoney(h?.amount ?? 0)}));
    },
    onError: error => toast.error(errorMessage(error, t)),
  });

  const ask = () =>
    confirm.ask({
      title: t('cash.confirmTitle', {amount: formatMoney(h!.amount)}),
      message: t('cash.confirmHint', {count: h!.cashCount}),
      confirmLabel: t('cash.handOver'),
      onConfirm: () => handOver.mutateAsync(),
    });

  const header = (
    <>
      {holding.isPending ? (
        <SkeletonRows count={3} avatar={false} />
      ) : holding.isError || !h ? (
        <ErrorState error={holding.error} what={t('cash.title')} onRetry={holding.refetch} />
      ) : (
        <>
          <Card style={s.hero}>
            <Text variant="overline" color="muted">
              {t('cash.today', {date: formatDate(new Date(), lang, {short: true})})}
            </Text>
            <Text variant="display">{formatMoney(h.amount)}</Text>
            <Text variant="small" color="muted">
              {t('cash.cashLabel')}
            </Text>
            <KeyValueRows
              style={s.facts}
              rows={[
                {label: t('cash.cashPayments'), value: String(h.cashCount)},
                {label: t('cash.other'), value: formatMoney(h.otherAmount)},
                {label: t('cash.pending'), value: String(h.pendingApproval)},
              ]}
            />
          </Card>
          {h.payments.length ? (
            <Section title={t('cash.included')}>
              <Card padded={false}>
                {h.payments.slice(0, SHOWN).map(p => (
                  <ListRow
                    key={p._id}
                    title={p.customerName || '—'}
                    subtitle={p.loanNumber ? `#${p.loanNumber}` : undefined}
                    value={formatMoney(p.amount)}
                    style={s.row}
                  />
                ))}
                {h.payments.length > SHOWN ? (
                  <ListRow
                    title={t('cash.more', {count: h.payments.length - SHOWN})}
                    value={formatMoney(h.payments.slice(SHOWN).reduce((sum, p) => sum + p.amount, 0))}
                    style={s.row}
                  />
                ) : null}
              </Card>
            </Section>
          ) : (
            <EmptyState icon="hand-coin-outline" title={t('cash.nothing')} />
          )}
        </>
      )}
      <Text variant="overline" color="muted" style={s.historyTitle}>
        {t('cash.history')}
      </Text>
    </>
  );

  return (
    <Screen
      header={{title: t('cash.title')}}
      padded={false}
      fab={
        h && h.cashCount > 0 ? (
          <Fab
            icon="hand-coin"
            label={t('cash.handOverAmount', {amount: formatMoney(h.amount)})}
            onPress={ask}
            loading={handOver.isPending}
          />
        ) : undefined
      }>
      <FlatList
        {...listProps}
        data={history.items}
        keyExtractor={item => item._id}
        ListHeaderComponent={header}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={history.refreshing}
            onRefresh={() => {
              holding.refetch();
              history.refresh();
            }}
          />
        }
        onEndReached={history.loadMore}
        renderItem={({item}) => (
          <ListRow
            title={formatMoney(item.amount)}
            subtitle={`${formatDateTime(item.createdAt, lang)} · ${t('cash.payments', {count: item.cashCount})}`}
            meta={
              item.status === 'Short'
                ? t('cash.shortBy', {amount: formatMoney(item.shortBy ?? 0), note: item.note ?? ''})
                : undefined
            }
            badge={<StatusBadge tone={handoverTone(item.status)} label={t(`cash.status.${item.status}`)} />}
          />
        )}
        ListEmptyComponent={
          history.isLoading ? (
            <SkeletonRows count={2} avatar={false} />
          ) : (
            <Text color="muted">{t('cash.noHistory')}</Text>
          )
        }
      />
      <ConfirmSheet ref={confirm.ref} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  list: {paddingHorizontal: t.space.lg, paddingBottom: 96, flexGrow: 1},
  hero: {gap: t.space.xs},
  facts: {marginTop: t.space.sm},
  row: {paddingHorizontal: t.space.lg},
  historyTitle: {marginTop: t.space.xl, marginBottom: t.space.xs},
}));
