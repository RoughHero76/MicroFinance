// A15 Employees: photo, name, username and phone, with an Inactive pill for
// switched-off accounts; "+" floating button to register (U-03).

import React from 'react';
import {FlatList, RefreshControl} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {callPhone} from '@/lib/messaging';
import {useInfiniteList} from '@/lib/useInfiniteList';
import {makeStyles} from '@/theme';
import {
  Avatar,
  EmptyState,
  ErrorState,
  Fab,
  IconButton,
  ListRow,
  OfflineBanner,
  Screen,
  SkeletonRows,
  StatusBadge,
} from '@/ui';
import {getEmployeesPage, staffKeys} from '../api';

export default function EmployeesScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const list = useInfiniteList({queryKey: staffKeys.page(), fetchPage: getEmployeesPage, persist: true});
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
      {list.isLoading ? (
        <SkeletonRows count={6} />
      ) : list.isError ? (
        <ErrorState error={list.error} what={t('staff.title')} onRetry={list.refetch} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={item => item._id}
          renderItem={({item}) => {
            const name = `${item.fname} ${item.lname}`.trim();
            return (
              <ListRow
                left={<Avatar name={name} uri={item.profilePic} />}
                title={name}
                subtitle={[item.userName ? `@${item.userName}` : null, item.phoneNumber].filter(Boolean).join(' · ')}
                badge={
                  item.accountStatus === false ? <StatusBadge tone="neutral" label={t('staff.inactive')} /> : undefined
                }
                right={
                  item.phoneNumber ? (
                    <IconButton icon="phone" label={t('common.call')} onPress={() => callPhone(item.phoneNumber!)} />
                  ) : undefined
                }
                onPress={() => navigation.navigate('Employee' as never, {uid: item.uid} as never)}
              />
            );
          }}
          contentContainerStyle={s.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
          ListFooterComponent={list.isLoadingMore ? <SkeletonRows count={1} /> : null}
          ListEmptyComponent={
            <EmptyState
              icon="account-tie-outline"
              title={t('staff.empty')}
              actionLabel={t('staff.add')}
              onAction={add}
            />
          }
        />
      )}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  list: {paddingHorizontal: t.space.lg, paddingBottom: 96, flexGrow: 1},
}));
