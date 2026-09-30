// A13 · E8: one LeadList for both roles. The 5 statistics become chip counts
// plus "N total · N converted" under the title; chips scroll sideways.
// "Filters" holds follow-up status and (admin) assigned to. Rows have 2
// lines with the lead's photo; a due follow-up replaces the second line.
// Admins get a "Requested" chip for conversion requests; employees get the
// "+" floating button for a new lead.

import React, {useRef, useState} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import type {TFunction} from 'i18next';
import {useI18n} from '@/i18n';
import {leadDisplayStatus, normalizeLoanType} from '@/lib/enums';
import {formatDate, formatMoney, isSameDay} from '@/lib/format';
import {useInfiniteList} from '@/lib/useInfiniteList';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {listEmployees, staffKeys} from '@/features/staff/api';
import {makeStyles} from '@/theme';
import {
  Avatar,
  BottomSheet,
  Button,
  Chips,
  EmptyState,
  ErrorState,
  Fab,
  IconButton,
  ListRow,
  OfflineBanner,
  Screen,
  SearchField,
  SelectField,
  SkeletonRows,
  StatusBadge,
  type ChipOption,
  type SheetHandle,
} from '@/ui';
import {getLeadsPage, leadKeys, type Lead, type LeadFilter, type LeadStats} from '../api';

/** The follow-up line when one is due (today or earlier), else null. */
export function followupLine(lead: Lead, t: TFunction, lang: 'en' | 'hi'): string | null {
  if (lead.isLeadConverted || lead.followupStatus === 'Completed' || !lead.followupDate) return null;
  const date = new Date(lead.followupDate);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (date > endOfToday) return null;
  return isSameDay(date, new Date()) ? t('leads.followupToday') : t('leads.followupOn', {date: formatDate(date, lang)});
}

const personName = (p: Lead['AssignedTo']) =>
  p && typeof p === 'object' ? `${p.fname ?? ''} ${p.lname ?? ''}`.trim() : null;

export default function LeadListScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const navigation = useNavigation();
  const {role} = useSession();
  const can = useCan();
  const admin = role === 'admin';
  const filtersRef = useRef<SheetHandle>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<LeadFilter>('all');
  const [followupStatus, setFollowupStatus] = useState<'' | 'Pending' | 'Completed'>('');
  const [assignedTo, setAssignedTo] = useState('');

  const list = useInfiniteList({
    queryKey: [...leadKeys.list(role, filter, q, assignedTo), followupStatus],
    fetchPage: page => getLeadsPage(role!, {filter, q, assignedTo, followupStatus}, page),
    enabled: !!role,
    persist: filter === 'all' && !q && !assignedTo && !followupStatus,
  });
  // Keep the last counts while another chip's first page loads.
  const lastStats = useRef<LeadStats>();
  if (list.firstPage?.stats) lastStats.current = list.firstPage.stats;
  const stats = lastStats.current;

  const employees = useQuery({
    queryKey: staffKeys.list(),
    queryFn: listEmployees,
    enabled: admin,
    staleTime: 5 * 60 * 1000,
  });

  const label = (key: string, count?: number) => (count != null ? `${key} ${count}` : key);
  const chips: ChipOption<LeadFilter>[] = [
    {value: 'all', label: t('common.all')},
    ...(admin ? [{value: 'requested' as const, label: label(t('leads.requested'), stats?.conversionRequested)}] : []),
    {value: 'Pending', label: label(t('status.lead.Pending'), stats?.pending)},
    {value: 'InProgress', label: label(t('status.lead.InProgress'), stats?.inProgress)},
    {value: 'Approved', label: label(t('status.lead.Approved'), stats?.approved)},
    {value: 'Rejected', label: label(t('status.lead.Rejected'), stats?.rejected)},
    {value: 'Converted', label: label(t('status.lead.Converted'), stats?.converted)},
  ];
  const activeFilters = (followupStatus ? 1 : 0) + (assignedTo ? 1 : 0);
  const filtered = filter !== 'all' || !!q || activeFilters > 0;
  const add = () => navigation.navigate('NewLead' as never);

  const renderItem = ({item}: {item: Lead}) => {
    const due = followupLine(item, t, lang);
    const type = t(`enums.loanType.${normalizeLoanType(item.loanType) ?? 'Other'}`);
    const second = admin
      ? [personName(item.AssignedTo) ?? t('leads.unassigned'), type].join(' · ')
      : [type, item.city].filter(Boolean).join(' · ');
    return (
      <ListRow
        left={<Avatar name={item.name} uri={item.pictureUrl} />}
        title={item.name}
        value={formatMoney(item.loanAmount)}
        subtitle={due ?? second}
        meta={due ? second : undefined}
        badge={<StatusBadge set="lead" status={leadDisplayStatus(item)} />}
        onPress={() => navigation.navigate('Lead' as never, {id: item._id} as never)}
      />
    );
  };

  return (
    <Screen
      header={{
        title: admin ? t('leads.title') : t('leads.myTitle'),
        subtitle: stats ? t('leads.summary', {total: stats.total, converted: stats.converted}) : undefined,
        large: true,
      }}
      padded={false}
      banner={<OfflineBanner savedAt={list.dataUpdatedAt} />}
      fab={can('lead.create') ? <Fab icon="plus" label={t('leads.newLead')} onPress={add} /> : undefined}>
      <View style={s.top}>
        <SearchField value={q} onSearch={setQ} placeholder={t('leads.search')} style={s.search} />
        <IconButton
          icon={activeFilters ? 'filter' : 'filter-outline'}
          label={t('leads.filters')}
          variant={activeFilters ? 'tonal' : 'plain'}
          onPress={() => filtersRef.current?.open()}
        />
      </View>
      <Chips options={chips} value={filter} onChange={setFilter} style={s.chips} />
      {list.isLoading ? (
        <SkeletonRows count={6} />
      ) : list.isError ? (
        <ErrorState error={list.error} what={t('leads.title')} onRetry={list.refetch} />
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
            filtered ? (
              <EmptyState icon="filter-remove-outline" title={t('leads.emptyFiltered')} />
            ) : (
              <EmptyState
                icon="account-search-outline"
                title={t('leads.empty')}
                actionLabel={can('lead.create') ? t('leads.newLead') : undefined}
                onAction={can('lead.create') ? add : undefined}
              />
            )
          }
        />
      )}

      <BottomSheet
        ref={filtersRef}
        title={t('leads.filters')}
        footer={
          <>
            <Button
              title={t('common.clear')}
              variant="text"
              onPress={() => {
                setFollowupStatus('');
                setAssignedTo('');
                filtersRef.current?.close();
              }}
            />
            <Button title={t('common.done')} onPress={() => filtersRef.current?.close()} />
          </>
        }>
        <SelectField
          label={t('leads.followup')}
          value={followupStatus || 'any'}
          onChange={v => setFollowupStatus(v === 'any' ? '' : v)}
          options={[
            {value: 'any', label: t('common.all')},
            {value: 'Pending', label: t('status.followup.Pending')},
            {value: 'Completed', label: t('status.followup.Completed')},
          ]}
        />
        {admin ? (
          <SelectField
            label={t('leads.assignedTo')}
            value={assignedTo || 'any'}
            onChange={v => setAssignedTo(v === 'any' ? '' : v)}
            options={[
              {value: 'any', label: t('leads.anyone')},
              ...(employees.data ?? []).map(e => ({value: e._id, label: `${e.fname} ${e.lname}`.trim()})),
            ]}
          />
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  top: {flexDirection: 'row', alignItems: 'center', gap: t.space.xs, paddingHorizontal: t.space.lg},
  search: {flex: 1},
  chips: {marginVertical: t.space.sm},
  list: {paddingHorizontal: t.space.lg, paddingBottom: 96, flexGrow: 1},
}));
