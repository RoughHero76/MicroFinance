// A12 Payments (admin). 3 status tabs; loan number and date behind the
// filter icon. Grouped by collector (collapsible header with photo, count and
// total, plus "Approve all" (P-14)), then each payment's details as label /
// value rows. Approve offers Undo for 10 minutes (BE-19); Reject asks for a
// reason and has no Undo, because it moves money back.

import React, {useMemo, useRef, useState} from 'react';
import {Pressable, SectionList, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {errorMessage} from '@/lib/api';
import {formatDate, formatDateTime, formatMoney, toISODate} from '@/lib/format';
import {haptics} from '@/lib/haptics';
import {useRemembered} from '@/lib/useRemembered';
import {useInfiniteList} from '@/lib/useInfiniteList';
import {makeStyles} from '@/theme';
import {
  Avatar,
  BottomSheet,
  Button,
  ConfirmSheet,
  DateField,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  KeyValueRows,
  OfflineBanner,
  Screen,
  SkeletonRows,
  StatusBadge,
  Text,
  TextField,
  SegmentedControl,
  toast,
  useConfirm,
  type SheetHandle,
  listProps,
  RefreshControl,
} from '@/ui';
import {
  adminLoanKeys,
  approvePayment,
  approvePayments,
  getApprovalsPage,
  rejectPayment,
  unapprovePayment,
  type ApprovalItem,
} from '@/features/loans/adminApi';

type Tab = 'Pending' | 'Approved' | 'all';

interface Group {
  key: string;
  name: string;
  photo?: string | null;
  total: number;
  pendingIds: string[];
  data: ApprovalItem[];
}

export default function PaymentsScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const filterRef = useRef<SheetHandle>(null);
  const [tab, setTab, tabReady] = useRemembered<Tab>('payments.tab', 'Pending');
  const [loanNumber, setLoanNumber] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const filter = {loanNumber: loanNumber.trim() || undefined, date: date ? toISODate(date) : undefined};

  const list = useInfiniteList({
    queryKey: adminLoanKeys.approvals(tab, JSON.stringify(filter)),
    fetchPage: page => getApprovalsPage(tab, filter, page),
    enabled: tabReady,
    persist: tab === 'Pending' && !filter.loanNumber && !filter.date,
  });

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const item of list.items) {
      const collector = item.collector ?? null;
      const key = collector?._id ?? 'admin';
      const group = map.get(key) ?? {
        key,
        name: collector?.name ?? t('approvals.admin'),
        photo: collector?.profilePic,
        total: 0,
        pendingIds: [],
        data: [],
      };
      group.total += item.amount;
      if (item.status === 'Pending') group.pendingIds.push(item._id);
      group.data.push(item);
      map.set(key, group);
    }
    return [...map.values()];
  }, [list.items, t]);

  const refresh = () => {
    queryClient.invalidateQueries({queryKey: ['payments']});
    queryClient.invalidateQueries({queryKey: ['dashboard']});
    queryClient.invalidateQueries({queryKey: ['loans']});
  };

  const borrower = (item: ApprovalItem) =>
    item.loanDetails?.borrower ??
    (item.loan?.customer ? `${item.loan.customer.fname} ${item.loan.customer.lname}` : '');

  const approve = async (item: ApprovalItem) => {
    try {
      await approvePayment(item._id);
      haptics.success();
      // The row leaves the Pending list right away; the refetch confirms it.
      const putBack = tab === 'Pending' ? list.removeLocally(row => row._id === item._id) : () => {};
      refresh();
      toast.success(t('approvals.approvedToast', {name: borrower(item), amount: formatMoney(item.amount)}), {
        action: {
          label: t('common.undo'),
          onPress: async () => {
            try {
              await unapprovePayment(item._id);
              putBack();
              refresh();
              toast.info(t('loanAdmin.undone'));
            } catch (error) {
              toast.error(errorMessage(error, t));
            }
          },
        },
      });
    } catch (error) {
      toast.error(errorMessage(error, t));
    }
  };

  const reject = (item: ApprovalItem) =>
    confirm.ask({
      title: t('approvals.rejectTitle', {amount: formatMoney(item.amount), name: borrower(item)}),
      message: t('approvals.rejectHint'),
      input: {label: t('approvals.reason'), placeholder: t('approvals.reasonPlaceholder'), required: true},
      confirmLabel: t('approvals.reject'),
      destructive: true,
      onConfirm: async reason => {
        try {
          await rejectPayment(item._id, reason);
          if (tab === 'Pending') {
            list.removeLocally(row => row._id === item._id);
          }
          refresh();
          toast.success(t('approvals.rejected'));
        } catch (error) {
          toast.error(errorMessage(error, t));
          throw error;
        }
      },
    });

  const approveGroup = (group: Group) =>
    confirm.ask({
      title: t('approvals.approveAllConfirm', {count: group.pendingIds.length, name: group.name}),
      message: formatMoney(group.data.filter(d => d.status === 'Pending').reduce((sum, d) => sum + d.amount, 0)),
      confirmLabel: t('approvals.approve'),
      onConfirm: async () => {
        try {
          const res = await approvePayments(group.pendingIds);
          haptics.success();
          if (tab === 'Pending') {
            const done = new Set(res.data.approved.map(String));
            list.removeLocally(row => done.has(String(row._id)));
          }
          refresh();
          toast.success(t('approvals.approvedMany', {count: res.data.approved.length}));
        } catch (error) {
          toast.error(errorMessage(error, t));
          throw error;
        }
      },
    });

  const sections = groups.map(g => ({...g, data: collapsed[g.key] ? [] : g.data}));

  return (
    <Screen
      header={{
        title: t('approvals.title'),
        right: (
          <IconButton
            icon={filter.loanNumber || filter.date ? 'filter' : 'filter-outline'}
            label={t('approvals.filters')}
            variant="plain"
            onPress={() => filterRef.current?.open()}
          />
        ),
      }}
      padded={false}
      banner={<OfflineBanner savedAt={list.dataUpdatedAt} />}>
      <SegmentedControl<Tab>
        options={[
          {value: 'Pending', label: t('approvals.pending')},
          {value: 'Approved', label: t('approvals.approved')},
          {value: 'all', label: t('approvals.all')},
        ]}
        value={tab}
        onChange={setTab}
        style={s.tabs}
      />
      {list.isLoading ? (
        <SkeletonRows count={6} />
      ) : list.isError ? (
        <ErrorState error={list.error} what={t('approvals.title')} onRetry={list.refetch} />
      ) : (
        <SectionList
          {...listProps}
          removeClippedSubviews={false}
          sections={sections}
          keyExtractor={item => item._id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={s.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
          renderSectionHeader={({section}) => {
            const group = section as unknown as Group;
            const open = !collapsed[group.key];
            return (
              <View style={s.groupHead}>
                <Pressable
                  onPress={() => setCollapsed(c => ({...c, [group.key]: open}))}
                  style={s.groupTop}
                  accessibilityRole="button"
                  accessibilityState={{expanded: open}}>
                  <Avatar name={group.name} uri={group.photo} size={40} />
                  <View style={s.flex}>
                    <Text variant="bodyLg" weight="semibold" numberOfLines={1}>
                      {group.name}
                    </Text>
                    <Text variant="small" color="muted">
                      {t('approvals.groupLine', {count: groups.find(g => g.key === group.key)?.data.length ?? 0})}
                    </Text>
                  </View>
                  <Text variant="bodyLg" weight="semibold" tabular>
                    {formatMoney(group.total)}
                  </Text>
                  <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color="muted" />
                </Pressable>
                {group.pendingIds.length > 1 ? (
                  <Button
                    title={t('approvals.approveAll', {
                      count: group.pendingIds.length,
                      amount: formatMoney(
                        groups
                          .find(g => g.key === group.key)!
                          .data.filter(d => d.status === 'Pending')
                          .reduce((sum, d) => sum + d.amount, 0),
                      ),
                    })}
                    variant="text"
                    icon="check-all"
                    onPress={() => approveGroup(groups.find(g => g.key === group.key)!)}
                    style={s.approveAll}
                  />
                ) : null}
              </View>
            );
          }}
          renderItem={({item}) => (
            <View style={s.card}>
              <Pressable
                onPress={
                  item.loan?._id
                    ? () => navigation.navigate('Loan' as never, {loanId: item.loan!._id} as never)
                    : undefined
                }
                accessibilityRole="link"
                accessibilityLabel={`${borrower(item)}, ${formatMoney(item.amount)}`}
                style={s.line}>
                <Text variant="bodyLg" weight="bold" numberOfLines={1} style={s.flex}>
                  {borrower(item)}
                </Text>
                <Text variant="title" weight="bold" tabular>
                  {formatMoney(item.amount)}
                </Text>
              </Pressable>
              <View style={s.line}>
                <Text variant="small" color="muted" style={s.flex} numberOfLines={1}>
                  {[
                    item.loan?.loanNumber ? `#${item.loan.loanNumber}` : null,
                    item.loanDetails?.loanAmount ? formatMoney(item.loanDetails.loanAmount) : null,
                    formatDate(item.paymentDate, lang, {short: true}),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <StatusBadge set="repayment" status={item.status} />
              </View>
              <KeyValueRows
                dense
                rows={[
                  {
                    label: t('approvals.method'),
                    value: t(`enums.paymentMethod.${item.paymentMethod}`, {defaultValue: item.paymentMethod}),
                  },
                  {
                    label: t('approvals.remaining'),
                    value: item.balanceAfterPayment != null ? formatMoney(item.balanceAfterPayment) : '',
                  },
                  {label: t('approvals.transaction'), value: item.transactionId, copy: true},
                  {label: t('approvals.note'), value: item.logicNote},
                  {label: t('loan.rejectedReason'), value: item.rejectionReason, valueColor: 'danger'},
                ]}
              />
              <Text variant="caption" color="muted">
                {formatDateTime(item.paymentDate, lang)}
              </Text>
              {item.status === 'Pending' ? (
                <View style={s.actions}>
                  <Button title={t('approvals.reject')} variant="secondary" onPress={() => reject(item)} />
                  <Button title={t('approvals.approve')} onPress={() => approve(item)} />
                </View>
              ) : null}
            </View>
          )}
          ListFooterComponent={list.isLoadingMore ? <SkeletonRows count={1} /> : null}
          ListEmptyComponent={
            <EmptyState icon="cash-check" title={t('approvals.empty')} message={t('approvals.emptyHint')} />
          }
        />
      )}

      <BottomSheet
        ref={filterRef}
        title={t('approvals.filters')}
        footer={
          <>
            <Button
              title={t('common.clear')}
              variant="text"
              onPress={() => {
                setLoanNumber('');
                setDate(null);
              }}
            />
            <Button title={t('common.apply')} onPress={() => filterRef.current?.close()} />
          </>
        }>
        <TextField
          label={t('approvals.loanNumber')}
          value={loanNumber}
          onChangeText={setLoanNumber}
          keyboardType="number-pad"
        />
        <DateField label={t('approvals.date')} value={date} onChange={setDate} clearable />
      </BottomSheet>
      <ConfirmSheet ref={confirm.ref} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  list: {padding: t.space.lg, paddingBottom: t.space.xxl, flexGrow: 1},
  groupHead: {marginTop: t.space.md, marginBottom: t.space.sm},
  groupTop: {flexDirection: 'row', alignItems: 'center', gap: t.space.md},
  approveAll: {alignSelf: 'flex-end'},
  tabs: {marginHorizontal: t.space.lg, marginBottom: t.space.sm},
  flex: {flex: 1, minWidth: 0},
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...t.shadow.card,
    padding: t.space.md,
    marginBottom: 10,
    gap: t.space.xs,
  },
  line: {flexDirection: 'row', alignItems: 'center', gap: t.space.sm},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: t.space.sm, marginTop: t.space.xs},
}));
