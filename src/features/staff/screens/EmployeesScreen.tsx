// A15 Employees: photo, name, username and phone, with an Inactive pill for
// switched-off accounts; "+" floating button to register (U-03). E-07: search,
// All / Active / Inactive chips with counts, and today's collection on each
// row (amount top right, % below); the call button stays.

import React, {useState} from 'react';
import {FlatList} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {formatMoney} from '@/lib/format';
import {callPhone} from '@/lib/messaging';
import {useInfiniteList} from '@/lib/useInfiniteList';
import {makeStyles} from '@/theme';
import {
  Avatar,
  Chips,
  EmptyState,
  ErrorState,
  Fab,
  IconButton,
  ListRow,
  OfflineBanner,
  Screen,
  SearchField,
  SkeletonRows,
  StatusBadge,
  listProps,
  RefreshControl,
} from '@/ui';
import {getEmployeesPage, staffKeys, type EmployeeCounts, type EmployeeStatusFilter} from '../api';

export default function EmployeesScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<EmployeeStatusFilter>('all');
  const [counts, setCounts] = useState<EmployeeCounts | null>(null);
  const list = useInfiniteList({
    queryKey: staffKeys.page(q, status),
    fetchPage: async page => {
      const res = await getEmployeesPage(page, {q, status});
      if (page === 1 && res.counts) setCounts(res.counts);
      return res;
    },
    persist: !q && status === 'all',
  });
  const chip = (value: EmployeeStatusFilter, label: string) => ({
    value,
    label: counts ? `${label} ${counts[value]}` : label,
  });
  const add = () => navigation.navigate('EmployeeForm' as never);

  return (
    <Screen
      header={{
        title: t('staff.title'),
        subtitle: list.total != null ? t('staff.count', {count: list.total}) : undefined,
      }}
      padded={false}
      banner={<OfflineBanner savedAt={list.dataUpdatedAt} />}
      fab={<Fab icon="account-plus" label={t('staff.add')} onPress={add} />}>
      <SearchField value={q} onSearch={setQ} placeholder={t('staff.search')} style={s.search} />
      <Chips<EmployeeStatusFilter>
        options={[
          chip('all', t('common.all')),
          chip('active', t('staff.activeChip')),
          chip('inactive', t('staff.inactive')),
        ]}
        value={status}
        onChange={setStatus}
        style={s.chips}
      />
      {list.isLoading ? (
        <SkeletonRows count={6} />
      ) : list.isError ? (
        <ErrorState error={list.error} what={t('staff.title')} onRetry={list.refetch} />
      ) : (
        <FlatList
          {...listProps}
          data={list.items}
          keyExtractor={item => item._id}
          renderItem={({item}) => {
            const name = `${item.fname} ${item.lname}`.trim();
            return (
              <ListRow
                left={<Avatar name={name} uri={item.profilePic} />}
                title={name}
                subtitle={[item.userName ? `@${item.userName}` : null, item.phoneNumber].filter(Boolean).join(' · ')}
                value={item.today && item.accountStatus !== false ? formatMoney(item.today.collected) : undefined}
                meta={
                  item.today && item.accountStatus !== false
                    ? item.today.percent != null
                      ? t('staff.percentOfToday', {percent: item.today.percent})
                      : t('staff.nothingDue')
                    : undefined
                }
                badge={
                  item.accountStatus === false ? <StatusBadge tone="neutral" label={t('staff.inactive')} /> : undefined
                }
                right={
                  item.phoneNumber ? (
                    <IconButton icon="phone" label={t('common.call')} onPress={() => callPhone(item.phoneNumber!)} />
                  ) : undefined
                }
                onPress={() => navigation.navigate('Employee' as never, {uid: item.uid} as never)}
                card
              />
            );
          }}
          contentContainerStyle={s.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
          ListFooterComponent={list.isLoadingMore ? <SkeletonRows count={1} /> : null}
          ListEmptyComponent={
            q || status !== 'all' ? (
              <EmptyState icon="magnify" title={q ? t('customers.noMatch', {q}) : t('staff.noneHere')} />
            ) : (
              <EmptyState
                icon="account-tie-outline"
                title={t('staff.empty')}
                actionLabel={t('staff.add')}
                onAction={add}
              />
            )
          }
        />
      )}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  search: {marginHorizontal: t.space.lg, marginBottom: t.space.sm},
  chips: {marginBottom: t.space.sm},
  list: {paddingHorizontal: t.space.lg, paddingBottom: 96, flexGrow: 1},
}));
