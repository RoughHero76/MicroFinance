// A5 Loans (admin tab). Status chips scroll sideways; sort is the ⇅ icon;
// each row has 2 lines: customer and amount, then loan number, collector
// and status. Search covers loan number, name and phone (BE-8).

import React, {useRef, useState} from 'react';
import {FlatList, RefreshControl} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {LOAN_STATUSES, type LoanStatus} from '@/lib/enums';
import {formatMoney} from '@/lib/format';
import {useRemembered} from '@/lib/useRemembered';
import {useInfiniteList} from '@/lib/useInfiniteList';
import {makeStyles} from '@/theme';
import {
  Avatar,
  BottomSheet,
  EmptyState,
  ErrorState,
  IconButton,
  ListRow,
  OfflineBanner,
  OptionRow,
  Screen,
  SearchField,
  SkeletonRows,
  StatusBadge,
  Chips,
  type SheetHandle,
} from '@/ui';
import {adminLoanKeys, getLoansPage, type LoanSort} from '../adminApi';
import type {CustomerRef, Loan, PersonRef} from '../types';

type Filter = 'all' | LoanStatus;

export default function LoansScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const [status, setStatus, statusReady] = useRemembered<Filter>('loans.status', 'all');
  const [q, setQ] = useState('');
  const [sort, setSort, sortReady] = useRemembered<LoanSort>('loans.sort', 'createdAt');
  const sortRef = useRef<SheetHandle>(null);

  const list = useInfiniteList({
    queryKey: adminLoanKeys.list(status, q, sort),
    fetchPage: page => getLoansPage(status, q, sort, page),
    enabled: statusReady && sortReady,
    persist: status === 'all' && !q,
  });

  const renderItem = ({item}: {item: Loan}) => {
    const c = typeof item.customer === 'object' ? (item.customer as CustomerRef) : null;
    const collector = typeof item.assignedTo === 'object' && item.assignedTo ? (item.assignedTo as PersonRef) : null;
    const name = c ? `${c.fname} ${c.lname}` : '';
    return (
      <ListRow
        left={<Avatar name={name} uri={c?.profilePic} />}
        title={name || `#${item.loanNumber}`}
        value={formatMoney(item.loanAmount)}
        subtitle={t('loans.rowSub', {
          number: item.loanNumber,
          collector: collector
            ? [collector.fname, collector.lname?.[0] ? `${collector.lname[0]}.` : ''].join(' ').trim()
            : t('common.unassigned'),
        })}
        badge={<StatusBadge set="loan" status={item.status} />}
        onPress={() => navigation.navigate('Loan' as never, {loanId: item._id} as never)}
        style={s.row}
      />
    );
  };

  const sorts: {value: LoanSort; label: string}[] = [
    {value: 'createdAt', label: t('loans.sortCreated')},
    {value: 'updatedAt', label: t('loans.sortUpdated')},
    {value: 'loanNumber', label: t('loans.sortNumber')},
  ];

  return (
    <Screen
      header={{
        title: t('loans.title'),
        large: true,
        subtitle: list.total != null ? String(list.total) : undefined,
        right: (
          <IconButton icon="sort" label={t('loans.sort')} variant="plain" onPress={() => sortRef.current?.open()} />
        ),
      }}
      padded={false}
      banner={<OfflineBanner savedAt={list.dataUpdatedAt} />}>
      <SearchField value={q} onSearch={setQ} placeholder={t('loans.search')} style={s.search} />
      <Chips<Filter>
        options={[
          {value: 'all', label: t('common.all')},
          ...LOAN_STATUSES.map(st => ({value: st, label: t(`status.loan.${st}`)})),
        ]}
        value={status}
        onChange={setStatus}
        style={s.chips}
      />
      {list.isLoading ? (
        <SkeletonRows count={8} />
      ) : list.isError ? (
        <ErrorState error={list.error} what={t('loans.title')} onRetry={list.refetch} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
          ListFooterComponent={list.isLoadingMore ? <SkeletonRows count={1} /> : null}
          ListEmptyComponent={
            q ? (
              <EmptyState icon="magnify" title={t('customers.noMatch', {q})} />
            ) : (
              <EmptyState icon="bank-outline" title={status === 'all' ? t('loans.empty') : t('loans.emptyFiltered')} />
            )
          }
        />
      )}
      <BottomSheet ref={sortRef} title={t('loans.sort')}>
        {sorts.map(option => (
          <OptionRow
            key={option.value}
            title={option.label}
            icon={sort === option.value ? 'check' : 'sort'}
            onPress={() => {
              setSort(option.value);
              sortRef.current?.close();
            }}
          />
        ))}
      </BottomSheet>
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  search: {marginHorizontal: t.space.lg, marginBottom: t.space.sm},
  chips: {marginBottom: t.space.sm},
  list: {paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, flexGrow: 1},
  row: {borderRadius: t.radius.lg, marginBottom: t.space.sm, borderWidth: 1, borderColor: t.colors.border},
}));
