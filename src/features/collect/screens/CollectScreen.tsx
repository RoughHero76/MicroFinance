// E2 Collect: today's installments for the employee's loans. Overdue first,
// then due today, then partly paid; collected rows move to "Done" at the
// bottom, so the list shrinks through the day (P-16). Search by name, phone
// or loan number. Pay and Penalty open the shared sheets (E3, E3b).

import React, {useMemo, useState} from 'react';
import {RefreshControl, SectionList, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {formatMoney} from '@/lib/format';
import {useCollect} from '@/features/loans/components/CollectSheets';
import {amountStillDue, installmentTotal} from '@/features/loans/schedule';
import {makeStyles} from '@/theme';
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  OfflineBanner,
  Screen,
  SearchField,
  SkeletonRows,
  StatusBadge,
  Text,
  useIsOffline,
  useListEntrance,
  listProps,
} from '@/ui';
import {collectKeys, getTodaysCollections, type CollectionItem} from '../api';

type GroupKey = 'overdue' | 'due' | 'partial' | 'done';
const ORDER: GroupKey[] = ['overdue', 'due', 'partial', 'done'];

function groupOf(item: CollectionItem): GroupKey {
  if (item.done) return 'done';
  if (item.status === 'Overdue') return 'overdue';
  if (item.status === 'PartiallyPaid') return 'partial';
  return 'due';
}

function customerName(item: CollectionItem) {
  return `${item.loan.customer.fname ?? ''} ${item.loan.customer.lname ?? ''}`.trim();
}

export default function CollectScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const offline = useIsOffline();
  const collect = useCollect();
  const [q, setQ] = useState('');
  const entering = useListEntrance();

  const query = useQuery({queryKey: collectKeys.today, queryFn: getTodaysCollections, meta: {persist: true}});
  const items = useMemo(() => query.data ?? [], [query.data]);

  const sections = useMemo(() => {
    const needle = q.toLowerCase();
    const filtered = needle
      ? items.filter(
          item =>
            customerName(item).toLowerCase().includes(needle) ||
            (item.loan.customer.phoneNumber ?? '').includes(needle) ||
            String(item.loan.loanNumber ?? '')
              .toLowerCase()
              .includes(needle),
        )
      : items;
    const titles: Record<GroupKey, string> = {
      overdue: t('collect.groupOverdue'),
      due: t('collect.groupDue'),
      partial: t('collect.groupPartial'),
      done: t('collect.groupDone'),
    };
    return ORDER.map(key => ({key, title: titles[key], data: filtered.filter(item => groupOf(item) === key)})).filter(
      section => section.data.length > 0,
    );
  }, [items, q, t]);

  const dueCount = items.filter(i => !i.done).length;

  const targetOf = (item: CollectionItem) => ({
    loanId: item.loan._id,
    loanNumber: item.loan.loanNumber,
    installmentId: item._id,
    installmentNumber: item.loanInstallmentNumber,
    installmentAmount: installmentTotal(item),
    dueAmount: amountStillDue(item),
    customerName: customerName(item),
    phone: item.loan.customer.phoneNumber,
  });

  const renderItem = ({item, index}: {item: CollectionItem; index: number}) => {
    const name = customerName(item);
    const due = amountStillDue(item);
    return (
      <Animated.View entering={entering(index)} style={[s.row, item.done && s.rowDone]}>
        <View style={s.rowTop}>
          <Avatar name={name} uri={item.loan.customer.profilePic} size={44} />
          <View style={s.rowText}>
            <View style={s.line}>
              <Text variant="bodyLg" weight="semibold" numberOfLines={1} style={s.flex}>
                {name}
              </Text>
              <StatusBadge set="schedule" status={item.status} />
            </View>
            <Text variant="small" color="muted" numberOfLines={1}>
              {t('collect.installmentLine', {loan: item.loan.loanNumber, number: item.loanInstallmentNumber ?? '-'})}
            </Text>
          </View>
        </View>
        {!item.done ? (
          <View style={s.actions}>
            <View style={s.due} accessibilityLabel={t('collect.due', {amount: formatMoney(due)})}>
              <Text variant="small" color="muted">
                {t('collect.dueLabel')}
              </Text>
              <Text variant="title" weight="bold" tabular numberOfLines={1}>
                {formatMoney(due)}
              </Text>
            </View>
            <Button title={t('collect.penalty')} variant="text" onPress={() => collect.penalty(targetOf(item))} />
            <Button title={t('collect.pay')} onPress={() => collect.pay(targetOf(item))} disabled={offline} />
          </View>
        ) : null}
      </Animated.View>
    );
  };

  return (
    <Screen
      header={{title: t('collect.title'), subtitle: t('collect.dueToday', {count: dueCount}), large: true}}
      padded={false}
      banner={<OfflineBanner savedAt={query.dataUpdatedAt} />}>
      <SearchField
        value={q}
        onSearch={setQ}
        placeholder={t('collect.searchPlaceholder')}
        style={s.search}
        debounceMs={150}
      />
      {query.isPending ? (
        <SkeletonRows count={6} />
      ) : query.isError && !items.length ? (
        <ErrorState error={query.error} what={t('collect.title')} onRetry={query.refetch} />
      ) : (
        <SectionList
          {...listProps}
          removeClippedSubviews={false}
          sections={sections}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          renderSectionHeader={({section}) => (
            <Text variant="overline" color="muted" style={s.sectionHeader}>
              {section.title} · {section.data.length}
            </Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}
          ListEmptyComponent={
            q ? (
              <EmptyState icon="magnify" title={t('customers.noMatch', {q})} />
            ) : items.length ? (
              <EmptyState
                icon="party-popper"
                title={t('collect.allCollected')}
                message={t('collect.allCollectedHint')}
              />
            ) : (
              <EmptyState
                icon="calendar-check"
                title={t('collect.nothingDue')}
                actionLabel={t('overdue.title')}
                onAction={() => navigation.navigate('Overdue' as never)}
              />
            )
          }
        />
      )}
      {collect.sheets}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  search: {marginHorizontal: t.space.lg, marginBottom: t.space.sm},
  list: {paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, flexGrow: 1},
  sectionHeader: {marginTop: t.space.lg, marginBottom: t.space.sm},
  row: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...t.shadow.card,
    padding: t.space.md,
    marginBottom: 10,
    gap: t.space.sm,
  },
  rowDone: {opacity: 0.7},
  rowTop: {flexDirection: 'row', alignItems: 'center', gap: t.space.md},
  rowText: {flex: 1, gap: 2, minWidth: 0},
  line: {flexDirection: 'row', alignItems: 'center', gap: t.space.sm},
  flex: {flex: 1, minWidth: 0},
  actions: {flexDirection: 'row', alignItems: 'center', gap: t.space.xs},
  due: {flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', gap: t.space.xs},
}));
