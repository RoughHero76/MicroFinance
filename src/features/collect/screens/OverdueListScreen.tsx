// E7 overdue list (also the admin's list from Portfolio risk, A18). Level
// chips scroll sideways; each card has 2 lines, a round call icon and one
// Collect button, which lists the overdue installments to pick from. Admins
// collect too (BE-10). The server limits employees to their own loans.

import React, {useMemo, useRef, useState} from 'react';
import {FlatList, View} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {formatDate, formatMoney} from '@/lib/format';
import {callPhone} from '@/lib/messaging';
import {useInfiniteList} from '@/lib/useInfiniteList';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {useCollect, type CollectTarget} from '@/features/loans/components/CollectSheets';
import {amountStillDue, installmentTotal} from '@/features/loans/schedule';
import type {Installment} from '@/features/loans/types';
import type {AppStackParamList} from '@/navigation/types';
import {makeStyles} from '@/theme';
import {
  BottomSheet,
  Button,
  Card,
  Chips,
  Avatar,
  EmptyState,
  ErrorState,
  IconButton,
  ListRow,
  OfflineBanner,
  Screen,
  SkeletonRows,
  StatusBadge,
  Text,
  type SheetHandle,
  listProps,
  useListEntrance,
  RefreshControl,
} from '@/ui';
import {collectKeys, getOverduePage, type OverdueBucket, type OverdueLoan} from '../api';

export default function OverdueListScreen() {
  const s = useStyles();
  const entering = useListEntrance();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const {role} = useSession();
  const can = useCan();
  const route = useRoute<RouteProp<AppStackParamList, 'Overdue'>>();
  // E-05: opened from an employee's profile, only their loans.
  const employee = route.params?.employee;
  const [bucket, setBucket] = useState<OverdueBucket>(route.params?.bucket ?? 'all');
  const collect = useCollect();
  const pickRef = useRef<SheetHandle>(null);
  const [picking, setPicking] = useState<OverdueLoan | null>(null);

  const list = useInfiniteList({
    queryKey: collectKeys.overdue(bucket, employee?.id),
    fetchPage: page => getOverduePage(bucket, page, employee?.id),
    persist: !employee,
  });

  const nameOf = (row: OverdueLoan) => `${row.loan.customer?.fname ?? ''} ${row.loan.customer?.lname ?? ''}`.trim();

  const targetFor = (row: OverdueLoan, installment: Installment): CollectTarget => ({
    loanId: row.loan._id,
    loanNumber: row.loan.loanNumber,
    installmentId: installment._id,
    installmentNumber: installment.loanInstallmentNumber,
    installmentAmount: installmentTotal(installment),
    dueAmount: amountStillDue(installment) || installmentTotal(installment),
    customerName: nameOf(row),
    phone: row.loan.customer?.phoneNumber,
    assignedTo: row.loan.assignedTo,
  });

  const openCollect = (row: OverdueLoan) => {
    const open = row.repaymentSchedules ?? [];
    if (open.length === 1) {
      collect.pay(targetFor(row, open[0]));
      return;
    }
    setPicking(row);
    requestAnimationFrame(() => pickRef.current?.open());
  };

  const chips = useMemo(
    () => [
      {value: 'all' as const, label: t('overdue.all')},
      {value: 'sma0' as const, label: t('status.risk.sma0')},
      {value: 'sma1' as const, label: t('status.risk.sma1')},
      {value: 'sma2' as const, label: t('status.risk.sma2')},
      {value: 'npa' as const, label: t('status.risk.npa')},
    ],
    [t],
  );

  const renderItem = ({item}: {item: OverdueLoan}) => {
    const name = nameOf(item);
    const count = item.repaymentSchedules?.length ?? 0;
    const phone = item.loan.customer?.phoneNumber;
    return (
      <Card style={s.card}>
        <View style={s.top}>
          <Avatar name={name} uri={item.loan.customer?.profilePic} size={44} />
          <View style={s.flex}>
            <View style={s.line}>
              <Text variant="bodyLg" weight="bold" numberOfLines={1} style={s.flex}>
                {name}
              </Text>
              <Text variant="bodyLg" weight="bold" color="danger" tabular>
                {formatMoney(item.totalOverdue)}
              </Text>
            </View>
            <View style={s.line}>
              <Text variant="small" color="muted" numberOfLines={1} style={s.flex}>
                #{item.loan.loanNumber} ·{' '}
                {count === 1 ? t('overdue.installmentOverdue') : t('overdue.installmentsOverdue', {count})}
              </Text>
              <StatusBadge
                label={item.npa ? t('status.risk.npa') : t(`status.risk.sma${item.smaLevel ?? 0}`)}
                tone={item.npa ? 'danger' : item.smaLevel === 2 ? 'danger' : 'warning'}
              />
            </View>
          </View>
        </View>
        <View style={s.actions}>
          {phone ? (
            <IconButton icon="phone" variant="ring" label={t('common.call')} onPress={() => callPhone(phone)} />
          ) : null}
          {can('payment.record') ? <Button title={t('overdue.collect')} onPress={() => openCollect(item)} /> : null}
        </View>
      </Card>
    );
  };

  return (
    <Screen
      header={{
        title: employee ? t('overdue.title') : role === 'admin' ? t('overdue.titleAll') : t('overdue.title'),
        subtitle: employee?.name,
      }}
      padded={false}
      banner={<OfflineBanner savedAt={list.dataUpdatedAt} />}>
      <Chips options={chips} value={bucket} onChange={setBucket} style={s.chips} />
      {list.isLoading ? (
        <SkeletonRows count={5} avatar={false} />
      ) : list.isError ? (
        <ErrorState error={list.error} what={t('overdue.title')} onRetry={list.refetch} />
      ) : (
        <FlatList
          {...listProps}
          data={list.items}
          keyExtractor={item => item._id}
          renderItem={info => <Animated.View entering={entering(info.index)}>{renderItem(info)}</Animated.View>}
          contentContainerStyle={s.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
          ListFooterComponent={list.isLoadingMore ? <SkeletonRows count={1} avatar={false} /> : null}
          ListEmptyComponent={
            <EmptyState icon="check-decagram" title={t('overdue.none')} message={t('overdue.noneHint')} />
          }
        />
      )}

      <BottomSheet
        ref={pickRef}
        title={t('overdue.pickInstallment')}
        subtitle={picking ? `${nameOf(picking)} · #${picking.loan.loanNumber}` : undefined}>
        {(picking?.repaymentSchedules ?? []).map(installment => (
          <ListRow
            key={installment._id}
            title={`#${installment.loanInstallmentNumber ?? '-'} · ${formatDate(installment.dueDate, lang)}`}
            value={formatMoney(amountStillDue(installment) || installmentTotal(installment))}
            badge={<StatusBadge set="schedule" status={installment.status} />}
            chevron
            style={s.pickRow}
            onPress={() => {
              pickRef.current?.close();
              const row = picking!;
              requestAnimationFrame(() => collect.pay(targetFor(row, installment)));
            }}
          />
        ))}
      </BottomSheet>
      {collect.sheets}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  chips: {marginBottom: t.space.sm},
  list: {paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, flexGrow: 1},
  card: {marginBottom: 10, gap: t.space.sm},
  top: {flexDirection: 'row', alignItems: 'center', gap: t.space.md},
  line: {flexDirection: 'row', alignItems: 'center', gap: t.space.sm},
  flex: {flex: 1, minWidth: 0},
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: t.space.sm,
    marginTop: t.space.xs,
  },
  pickRow: {paddingHorizontal: 0, backgroundColor: 'transparent'},
}));
