// A2 · E4: one CustomerList for both roles. The employee version lists only
// customers with loans assigned to them (the server limits it), with a call
// button; the admin version gets the "+" floating button (U-03).

import React, {useState} from 'react';
import {FlatList, RefreshControl} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {callPhone} from '@/lib/messaging';
import {useInfiniteList} from '@/lib/useInfiniteList';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {makeStyles} from '@/theme';
import {EmptyState, ErrorState, Fab, IconButton, OfflineBanner, Screen, SearchField, SkeletonRows} from '@/ui';
import {customerKeys, getCustomersPage, type CustomerListItem} from '../api';
import {CustomerRow} from '../components/CustomerParts';

export default function CustomerListScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {role} = useSession();
  const can = useCan();
  const [q, setQ] = useState('');
  const mine = role === 'employee';

  const list = useInfiniteList({
    queryKey: customerKeys.list(role, q),
    fetchPage: page => getCustomersPage(role!, q, page),
    enabled: !!role,
    persist: !q,
  });

  const open = (customer: CustomerListItem) =>
    navigation.navigate('Customer' as never, {id: customer._id, uid: customer.uid} as never);

  return (
    <Screen
      header={{
        title: mine ? t('customers.myTitle') : t('customers.title'),
        subtitle:
          list.total != null
            ? mine
              ? t('customers.myCount', {count: list.total})
              : t('customers.count', {count: list.total})
            : undefined,
        large: true,
      }}
      padded={false}
      banner={<OfflineBanner savedAt={list.dataUpdatedAt} />}
      fab={
        can('customer.create') ? (
          <Fab
            icon="account-plus"
            label={t('customers.add')}
            onPress={() => navigation.navigate('CustomerRegistration' as never)}
          />
        ) : undefined
      }>
      <SearchField value={q} onSearch={setQ} placeholder={t('customers.search')} style={s.search} />
      {list.isLoading ? (
        <SkeletonRows count={7} />
      ) : list.isError ? (
        <ErrorState error={list.error} what={t('customers.title')} onRetry={list.refetch} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={item => item._id}
          renderItem={({item}) => (
            <CustomerRow
              customer={item}
              onPress={() => open(item)}
              right={
                mine && item.phoneNumber ? (
                  <IconButton icon="phone" label={t('common.call')} onPress={() => callPhone(item.phoneNumber!)} />
                ) : undefined
              }
            />
          )}
          contentContainerStyle={s.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
          ListFooterComponent={list.isLoadingMore ? <SkeletonRows count={1} /> : null}
          ListEmptyComponent={
            q ? (
              <EmptyState icon="magnify" title={t('customers.noMatch', {q})} />
            ) : (
              <EmptyState
                icon="account-group-outline"
                title={mine ? t('customers.emptyMine') : t('customers.empty')}
                actionLabel={can('customer.create') ? t('customers.add') : undefined}
                onAction={
                  can('customer.create') ? () => navigation.navigate('CustomerRegistration' as never) : undefined
                }
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
  list: {paddingHorizontal: t.space.lg, paddingBottom: 96, flexGrow: 1},
}));
