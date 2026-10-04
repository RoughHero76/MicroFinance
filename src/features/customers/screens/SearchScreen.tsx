// A19 Search, both roles. Before typing: recent customers and recent
// searches (P-18). Results keep name, contact and each loan's amount and
// status; tapping one opens the profile directly. Employees only find
// customers on their assigned loans (the server limits it).

import React, {useState} from 'react';
import {FlatList} from 'react-native';
import {useFocusEffect, useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {formatMoneyShort} from '@/lib/format';
import {makeStyles} from '@/theme';
import {
  Avatar,
  Button,
  Chips,
  EmptyState,
  ErrorState,
  ListRow,
  Screen,
  SearchField,
  Section,
  SkeletonRows,
  Text,
  listProps,
} from '@/ui';
import {rememberSearch, useRecent} from '../recent';
import {searchCustomers, type SearchResult} from '../searchApi';

export default function SearchScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation();
  // X7 "Use for new loan": choosing a customer opens Create loan pre-filled.
  const params = useRoute<RouteProp<{Search: {pickFor?: 'newLoan'; prefill?: object} | undefined}, 'Search'>>().params;
  const picking = params?.pickFor === 'newLoan';
  const recent = useRecent();
  const [q, setQ] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      recent.reload();
    }, [recent.reload]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  const query = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchCustomers(q),
    enabled: q.length >= 2,
    staleTime: 30 * 1000,
  });

  const open = (c: {_id: string; uid?: string; name?: string}) => {
    if (picking) {
      if (q) rememberSearch(q);
      navigation.dispatch({
        type: 'REPLACE',
        payload: {name: 'CreateLoan', params: {customerUid: c.uid, customerName: c.name, prefill: params?.prefill}},
      } as never);
      return;
    }
    if (q) rememberSearch(q);
    navigation.navigate('Customer' as never, {id: c._id, uid: c.uid} as never);
  };

  const loansLine = (r: SearchResult) =>
    r.loans?.length
      ? r.loans
          .slice(0, 3)
          .map(
            l =>
              `${l.loanNumber ? `#${l.loanNumber} ` : ''}${formatMoneyShort(l.loanAmount)} ${t(
                `status.loan.${l.status}`,
                {defaultValue: l.status},
              )}`,
          )
          .join(' · ') + (r.loans.length > 3 ? ` +${r.loans.length - 3}` : '')
      : t('search.noLoans');

  const searching = q.length >= 2;

  return (
    <Screen header={{title: picking ? t('search.pickCustomer') : t('search.title')}} padded={false}>
      <SearchField value={q} onSearch={setQ} placeholder={t('search.placeholder')} autoFocus style={s.search} />
      {!searching ? (
        <FlatList
          {...listProps}
          data={recent.customers}
          keyExtractor={c => c._id}
          contentContainerStyle={s.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              {recent.searches.length ? (
                <Section title={t('search.recentSearches')}>
                  <Chips wrap options={recent.searches.map(v => ({value: v, label: v}))} value={null} onChange={setQ} />
                </Section>
              ) : null}
              {recent.customers.length ? (
                <Text variant="label" color="muted" style={s.recentTitle}>
                  {t('search.recent')}
                </Text>
              ) : null}
            </>
          }
          renderItem={({item}) => (
            <ListRow
              left={<Avatar name={item.name} uri={item.profilePic} />}
              title={item.name}
              subtitle={item.phoneNumber}
              chevron
              onPress={() => open(item)}
            />
          )}
          ListEmptyComponent={recent.searches.length ? null : <EmptyState icon="magnify" title={t('search.hint')} />}
          ListFooterComponent={
            recent.customers.length || recent.searches.length ? (
              <Button title={t('search.clear')} variant="text" onPress={recent.clear} style={s.clear} />
            ) : null
          }
        />
      ) : query.isPending ? (
        <SkeletonRows count={5} />
      ) : query.isError ? (
        <ErrorState error={query.error} what={t('search.title')} onRetry={query.refetch} />
      ) : (
        <FlatList
          {...listProps}
          data={query.data}
          keyExtractor={r => r._id}
          contentContainerStyle={s.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({item}) => (
            <ListRow
              left={<Avatar name={item.name} uri={item.profilePic} />}
              title={item.name}
              subtitle={[item.phoneNumber, item.userName ? `@${item.userName}` : item.email]
                .filter(Boolean)
                .join(' · ')}
              meta={loansLine(item)}
              onPress={() => open(item)}
            />
          )}
          ListEmptyComponent={<EmptyState icon="account-search-outline" title={t('search.noResults', {q})} />}
        />
      )}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  search: {marginHorizontal: t.space.lg, marginBottom: t.space.sm},
  list: {paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, flexGrow: 1},
  recentTitle: {marginTop: t.space.md, marginBottom: t.space.xs},
  clear: {alignSelf: 'center', marginTop: t.space.md},
}));
