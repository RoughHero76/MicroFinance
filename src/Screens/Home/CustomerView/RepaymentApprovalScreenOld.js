import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, Switch,
  ActivityIndicator, Modal, SafeAreaView, ScrollView, Alert,
} from 'react-native';
import Icon from '../../../design/Icon';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast, CustomToast } from '../../../components/toast/CustomToast';
import Screen from '../../../design/components/Screen';
import Card from '../../../design/components/Card';
import Button from '../../../design/components/Button';
import TextField from '../../../design/components/TextField';
import EmptyState from '../../../design/components/EmptyState';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * RepaymentApprovalScreenOld — the legacy flat-list approval queue,
 * rebuilt on the "Ink & Amber" design system to match the new screen.
 *  - same behaviour: GET /api/admin/loan/repayment/history/approve with
 *    limit 10 (this variant pages by 10), the direct approve (no confirm
 *    dialog) vs. the confirm-Alert reject flow, the same toasts and the
 *    exact reject copy ("This action cannot be undone.")
 *  - same fixes as the new screen: item.loanDetails is now optional
 *    (was an unguarded dereference that could crash the list), and
 *    reset-then-refetch bumps a reload key instead of calling a stale
 *    fetch closure; filter edits are drafted in the sheet and committed
 *    on "Apply Filters"
 */

const STATUS_META = {
  Approved: { dot: colors.success, ink: colors.successInk, bg: colors.successSoft },
  Pending: { dot: colors.warning, ink: colors.warningInk, bg: colors.warningSoft },
  Rejected: { dot: colors.danger, ink: colors.dangerInk, bg: colors.dangerSoft },
};

const statusMeta = (status) =>
  STATUS_META[status] || { dot: colors.neutral, ink: colors.neutralInk, bg: colors.neutralSoft };

const StatusPill = ({ status }) => {
  const meta = statusMeta(status);
  return (
    <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
      <Text style={[type.micro, { color: meta.ink }]}>{status || 'Unknown'}</Text>
    </View>
  );
};

const money = (v) => (v != null && !Number.isNaN(Number(v)) ? `₹${Number(v).toLocaleString()}` : 'N/A');

const DETAIL_ROWS = [
  { key: 'method', icon: 'wallet', label: 'Method', get: (r) => r.paymentMethod || 'N/A' },
  { key: 'remaining', icon: 'cash', label: 'Remaining', get: (r) => money(r.loan?.outstandingAmount) },
  { key: 'collector', icon: 'account-cash', label: 'Collected By', get: (r) => r.collectedBy || 'Admin' },
  { key: 'borrower', icon: 'account', label: 'Borrower', get: (r) => r.loanDetails?.borrower || 'N/A' },
  { key: 'loanAmount', icon: 'bank', label: 'Loan Amount', get: (r) => money(r.loanDetails?.loanAmount) },
  { key: 'transaction', icon: 'receipt', label: 'Transaction Note', get: (r) => r.transactionId || 'N/A' },
  { key: 'note', icon: 'information', label: 'Logical Note', get: (r) => r.logicNote || r.LogicNote || 'N/A' },
];

const DetailCell = ({ icon, label, value }) => (
  <View style={styles.detailCell}>
    <View style={styles.detailLabelRow}>
      <Icon name={icon} size={14} color={colors.inkMuted} />
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
  </View>
);

const ActionButton = ({ label, icon, bg, onPress, disabled, loading }) => (
  <Pressable
    style={({ pressed }) => [
      styles.actionBtn,
      { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
    ]}
    onPress={onPress}
    disabled={disabled}
    hitSlop={4}
  >
    {loading ? (
      <ActivityIndicator size="small" color={colors.white} style={{ marginRight: 8 }} />
    ) : (
      <Icon name={icon} size={18} color={colors.white} />
    )}
    <Text style={styles.actionText}>{label}</Text>
  </Pressable>
);

const RepaymentItem = React.memo(({ item, approveLoading, onApprove, onReject }) => (
  <Card style={styles.itemCard}>
    <View style={styles.itemHeader}>
      <View style={styles.itemHeaderLeft}>
        <Text style={styles.amount}>{money(item.amount)}</Text>
        <Text style={styles.dateText}>{new Date(item.paymentDate).toLocaleDateString()}</Text>
      </View>
      <StatusPill status={item.status} />
    </View>
    <View style={styles.detailGrid}>
      {DETAIL_ROWS.map((row) => (
        <DetailCell key={row.key} icon={row.icon} label={row.label} value={row.get(item)} />
      ))}
    </View>
    {item.status !== 'Approved' && (
      <View style={styles.actions}>
        <ActionButton
          label="Reject"
          icon="close-circle-outline"
          bg={colors.danger}
          disabled={approveLoading}
          onPress={() => onReject(item._id)}
        />
        <ActionButton
          label="Approve"
          icon="check-circle-outline"
          bg={colors.success}
          disabled={approveLoading}
          onPress={() => onApprove(item._id)}
        />
      </View>
    )}
  </Card>
));

const RepaymentApprovalScreenOld = () => {
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approveLoading, setApproveLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    loanNumber: '',
    defaultDate: true,
    date: new Date(),
    status: '',
  });
  const [draft, setDraft] = useState(null);

  const fetchRepayments = useCallback(async () => {
    if (loading || !hasMore) return;
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        defaultDate: filters.defaultDate.toString(),
        date: filters.date.toISOString().split('T')[0],
        status: filters.status,
      });
      if (filters.loanNumber) queryParams.append('loanNumber', filters.loanNumber);

      const response = await apiCall(
        `/api/admin/loan/repayment/history/approve?${queryParams}`,
        'GET'
      );
      if (response.status === 'success' && Array.isArray(response.data)) {
        setRepayments((prev) => [...prev, ...response.data]);
        setHasMore(response.data.length === 10);
        setPage((prev) => prev + 1);
      } else {
        console.error('Invalid data structure in repayment approval (old)');
        showToast('error', 'Failed to fetch repayments');
      }
    } catch (error) {
      console.error('Error fetching repayments:', error);
      showToast('error', 'Failed to fetch repayments');
    } finally {
      setLoading(false);
    }
  }, [page, filters, loading, hasMore, reloadKey]);

  useEffect(() => {
    fetchRepayments();
  }, [fetchRepayments]);

  const handleApprove = async (repaymentId) => {
    setApproveLoading(true);
    try {
      await apiCall('/api/admin/loan/repayment/history/approve', 'POST', { repaymentId });
      showToast('success', 'Repayment approved successfully');
      setRepayments([]);
      setHasMore(true);
      setPage(1);
      setReloadKey((k) => k + 1);
    } catch (error) {
      console.error('Error approving repayment:', error);
      showToast('error', 'Failed to approve repayment');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async (repaymentId) => {
    setApproveLoading(true);
    try {
      const response = await apiCall(
        '/api/admin/loan/repayment/history/reject',
        'POST',
        { repaymentId }
      );
      if (response.status === 'success') {
        showToast('success', 'Repayment rejected successfully');
      } else {
        showToast('error', response.message || 'Failed to reject repayment');
      }
      setRepayments([]);
      setHasMore(true);
      setPage(1);
      setReloadKey((k) => k + 1);
    } catch (error) {
      console.error('Error rejecting repayment:', error);
      showToast('error', 'Error', 'Failed to reject repayment');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleConfirmReject = (repaymentId) => {
    Alert.alert(
      'Confirm Reject',
      'Are you sure you want to reject this repayment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => handleReject(repaymentId) },
      ]
    );
  };

  const openFilters = () => {
    setDraft({ ...filters });
    setShowFilters(true);
  };

  const closeFilters = () => {
    setDraft(null);
    setShowFilters(false);
  };

  const applyFilters = () => {
    if (!draft) return;
    setFilters({ ...draft });
    setRepayments([]);
    setHasMore(true);
    setPage(1);
    setReloadKey((k) => k + 1);
    closeFilters();
  };

  return (
    <Screen bg={colors.bg}>
      <View style={styles.controls}>
        <Button label="Filters" icon="filter" variant="accent" size="sm" full onPress={openFilters} />
      </View>

      <FlatList
        data={repayments}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <RepaymentItem
            item={item}
            approveLoading={approveLoading}
            onApprove={handleApprove}
            onReject={handleConfirmReject}
          />
        )}
        contentContainerStyle={styles.listContent}
        onEndReached={fetchRepayments}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          loading ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="clipboard-check"
              title="No repayments to approve"
              subtitle="Pending repayment collections from your employees will show up here."
              style={{ marginTop: spacing.xxxl }}
            />
          ) : null
        }
      />

      <Modal visible={showFilters && !!draft} transparent animationType="slide" onRequestClose={closeFilters}>
        <Pressable style={styles.overlay} onPress={closeFilters}>
          <SafeAreaView style={styles.sheetContainer}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.grabber} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Filters</Text>
                <Pressable style={styles.closeBtn} onPress={closeFilters} hitSlop={8}>
                  <Icon name="close" size={20} color={colors.inkSecondary} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <TextField
                  label="Loan Number (optional)"
                  placeholder="e.g. LN-000123"
                  value={draft.loanNumber}
                  onChangeText={(v) => setDraft((d) => ({ ...d, loanNumber: v }))}
                  leftIcon="receipt"
                  style={styles.field}
                />

                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Use Default Date</Text>
                  <Switch
                    value={draft.defaultDate}
                    onValueChange={(v) => setDraft((d) => ({ ...d, defaultDate: v }))}
                    trackColor={{ true: colors.accent, false: colors.borderStrong }}
                    thumbColor={colors.white}
                  />
                </View>

                {!draft.defaultDate && (
                  <Pressable
                    style={({ pressed }) => [styles.dateBtn, pressed && { opacity: 0.85 }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Icon name="calendar" size={18} color={colors.inkSecondary} />
                    <Text style={styles.dateBtnText}>
                      {new Date(draft.date).toLocaleDateString()}
                    </Text>
                    <Icon name="chevron-right" size={16} color={colors.inkMuted} />
                  </Pressable>
                )}

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={draft.status}
                      onValueChange={(v) => setDraft((d) => ({ ...d, status: v }))}
                      style={styles.picker}
                    >
                      <Picker.Item label="All Statuses" value="" />
                      <Picker.Item label="Pending" value="Pending" />
                      <Picker.Item label="Approved" value="Approved" />
                    </Picker>
                    <Icon name="chevron-down" size={16} color={colors.inkMuted} />
                  </View>
                </View>

                <Button
                  label="Apply Filters"
                  icon="filter"
                  variant="accent"
                  size="lg"
                  full
                  style={{ marginTop: spacing.md }}
                  onPress={applyFilters}
                />
              </ScrollView>
              <CustomToast />
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>

      {showDatePicker && draft && (
        <DateTimePicker
          value={new Date(draft.date)}
          mode="date"
          display="default"
          onChange={(event, selected) => {
            setShowDatePicker(false);
            if (event.type === 'selected' && selected) {
              setDraft((d) => ({ ...d, date: selected }));
            }
          }}
        />
      )}

      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  itemCard: {
    marginBottom: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  itemHeaderLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  amount: {
    ...type.h2,
    color: colors.ink,
  },
  dateText: {
    ...type.sub,
    color: colors.inkMuted,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailCell: {
    width: '48%',
    marginRight: '4%',
    marginBottom: spacing.sm,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  detailLabel: {
    ...type.caption,
    color: colors.inkMuted,
  },
  detailValue: {
    ...type.body,
    color: colors.ink,
    fontSize: 13.5,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: radius.md,
  },
  actionText: {
    ...type.bodyBold,
    color: colors.white,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    alignItems: 'stretch',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.md,
    maxHeight: '85%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    ...type.h2,
    color: colors.ink,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...type.caption,
    color: colors.inkSecondary,
    marginBottom: 6,
    marginLeft: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  toggleLabel: {
    ...type.body,
    color: colors.ink,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBtnText: {
    ...type.body,
    color: colors.ink,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  pickerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: spacing.sm,
  },
  picker: {
    flex: 1,
    height: 52,
    color: colors.ink,
  },
});

export default RepaymentApprovalScreenOld;
