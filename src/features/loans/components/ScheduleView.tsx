// A7 · E6b: the loan's installments. Grouped (consecutive same-status runs
// collapse into one row, as the employee screen did) or All (one row each);
// the choice is remembered. Pages load 20 at a time as you scroll (B-9, U-05).
// Tapping an installment opens the InstallmentSheet (A7b).

import React, {useEffect, useMemo, useState} from 'react';
import {FlatList, Pressable, RefreshControl, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import type {ScheduleStatus} from '@/lib/enums';
import {formatDate, formatMoney} from '@/lib/format';
import {readJson, StorageKeys, writeJson} from '@/lib/storage';
import {useInfiniteList} from '@/lib/useInfiniteList';
import type {Role} from '@/lib/session';
import {makeStyles} from '@/theme';
import {Chips, EmptyState, ErrorState, Icon, SegmentedControl, SkeletonRows, StatusBadge, Text, listProps} from '@/ui';
import {getSchedulePage, loanKeys} from '../api';
import {amountPaidSoFar, groupRuns, installmentTotal, penaltyAmount, type InstallmentRun} from '../schedule';
import type {Installment} from '../types';

type Mode = 'grouped' | 'all';
type Filter = 'all' | ScheduleStatus;

export function ScheduleView({
  role,
  loanId,
  onOpen,
  header,
}: {
  role: Role;
  loanId: string;
  onOpen: (installment: Installment) => void;
  header?: React.ReactNode;
}) {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const [mode, setMode] = useState<Mode>('grouped');
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    readJson<Mode>(StorageKeys.scheduleView, 'grouped').then(setMode);
  }, []);
  const changeMode = (next: Mode) => {
    setMode(next);
    writeJson(StorageKeys.scheduleView, next);
  };

  const list = useInfiniteList({
    queryKey: loanKeys.schedule(loanId, filter),
    fetchPage: page => getSchedulePage(role, loanId, page, {status: filter === 'all' ? undefined : filter}),
  });

  const runs = useMemo(() => groupRuns(list.items), [list.items]);

  const row = (item: Installment) => {
    const paid = amountPaidSoFar(item);
    const penalty = penaltyAmount(item);
    return (
      <Pressable
        key={item._id}
        onPress={() => onOpen(item)}
        style={({pressed}) => [s.row, pressed && s.pressed]}
        accessibilityRole="button">
        <View style={s.rowText}>
          <Text weight="semibold" tabular>
            #{item.loanInstallmentNumber ?? '-'} · {formatDate(item.dueDate, lang, {short: true})}
          </Text>
          <Text variant="small" color="muted" tabular numberOfLines={1}>
            {item.status === 'PartiallyPaid'
              ? `${formatMoney(paid)} / ${formatMoney(installmentTotal(item))}`
              : formatMoney(installmentTotal(item))}
            {penalty ? ` · ${t('loan.penalty')} ${formatMoney(penalty)}` : ''}
          </Text>
        </View>
        <StatusBadge set="schedule" status={item.status} />
      </Pressable>
    );
  };

  const runRow = (run: InstallmentRun) => {
    if (run.items.length === 1) return row(run.first);
    const open = !!expanded[run.key];
    return (
      <View key={run.key} style={s.run}>
        <Pressable
          onPress={() => setExpanded(e => ({...e, [run.key]: !open}))}
          style={({pressed}) => [s.row, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityState={{expanded: open}}>
          <View style={s.rowText}>
            <Text weight="semibold">
              {t(`status.schedule.${run.status}`)} · {t('loan.installmentsCount', {count: run.items.length})}
            </Text>
            <Text variant="small" color="muted" tabular numberOfLines={1}>
              {t('loan.runRange', {
                from: run.first.loanInstallmentNumber ?? '-',
                to: run.last.loanInstallmentNumber ?? '-',
                start: formatDate(run.first.dueDate, lang, {short: true}),
                end: formatDate(run.last.dueDate, lang, {short: true}),
              })}
            </Text>
          </View>
          <StatusBadge set="schedule" status={run.status} />
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color="muted" />
        </Pressable>
        {open ? <View style={s.runItems}>{run.items.map(row)}</View> : null}
      </View>
    );
  };

  const filters: {value: Filter; label: string}[] = [
    {value: 'all', label: t('common.all')},
    {value: 'Overdue', label: t('status.schedule.Overdue')},
    {value: 'Pending', label: t('status.schedule.Pending')},
    {value: 'PartiallyPaid', label: t('status.schedule.PartiallyPaid')},
    {value: 'Paid', label: t('status.schedule.Paid')},
  ];

  return (
    <FlatList<InstallmentRun | {key: string; item: Installment}>
      {...listProps}
      data={mode === 'grouped' ? runs : list.items.map(item => ({key: item._id, item}))}
      keyExtractor={entry => entry.key}
      renderItem={({item: entry}) =>
        'items' in entry ? runRow(entry as InstallmentRun) : row((entry as {item: Installment}).item)
      }
      ListHeaderComponent={
        <View style={s.controls}>
          {header}
          <SegmentedControl<Mode>
            options={[
              {value: 'grouped', label: t('loan.grouped')},
              {value: 'all', label: t('loan.all')},
            ]}
            value={mode}
            onChange={changeMode}
          />
          <Chips options={filters} value={filter} onChange={setFilter} style={s.chips} />
          {list.total != null ? (
            <Text variant="small" color="muted">
              {t('loan.installmentsCount', {count: list.total})}
            </Text>
          ) : null}
        </View>
      }
      contentContainerStyle={s.list}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
      ListFooterComponent={
        list.isLoading || list.isLoadingMore ? (
          <SkeletonRows count={3} avatar={false} />
        ) : list.hasMore ? (
          <Text variant="caption" color="muted" align="center" style={s.footer}>
            {t('loan.loadMore')}
          </Text>
        ) : null
      }
      ListEmptyComponent={
        list.isError ? (
          <ErrorState error={list.error} what={t('loan.schedule')} onRetry={list.refetch} />
        ) : list.isLoading ? null : (
          <EmptyState icon="calendar-blank-outline" title={t('states.empty')} />
        )
      }
    />
  );
}

const useStyles = makeStyles(t => ({
  list: {padding: t.space.lg, paddingBottom: 96, flexGrow: 1},
  controls: {gap: t.space.sm, marginBottom: t.space.md},
  chips: {marginHorizontal: -t.space.lg},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    padding: t.space.md,
    minHeight: 56,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    marginBottom: t.space.sm,
  },
  pressed: {backgroundColor: t.colors.surface2},
  rowText: {flex: 1, gap: 2, minWidth: 0},
  run: {},
  runItems: {paddingLeft: t.space.lg},
  footer: {padding: t.space.md},
}));
