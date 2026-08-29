import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, SectionList, StyleSheet, Pressable, Switch,
  ActivityIndicator, Modal, SafeAreaView, ScrollView, Alert,
} from 'react-native';
import Icon from '../../../design/Icon';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast, CustomToast } from '../../../components/toast/CustomToast';
import { useNavigation } from '@react-navigation/native';
import Screen from '../../../design/components/Screen';
import Card from '../../../design/components/Card';
import Button from '../../../design/components/Button';
import TextField from '../../../design/components/TextField';
import EmptyState from '../../../design/components/EmptyState';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * RepaymentApprovalScreen — repayment approval queue rebuilt on the
 * "Ink & Amber" design system.
 *  - same behaviour: GET /api/admin/loan/repayment/history/approve with the
 *    exact query params (page, limit 1000, defaultDate, date, status,
 *    optional loanNumber), the `response.status === 'success'` checks,
 *    the same confirm Alerts and POST
 *    /api/admin/loan/repayment/history/approve|reject { repaymentId }
 *    calls, the same toasts and the 'OldRepaymentApproval' hand-off
 *  - grouping by collector then date is unchanged
 *  - fixes: item.loanDetails was dereferenced unguarded (crash when a
 *    repayment has no loanDetails), a failed first response left the
 *    loading spinner stuck forever, and reset-then-refetch used a stale
 *    page closure — resets now bump a reload key so the effect refetches
 *    page 1; filter edits are drafted in the sheet and committed on
 *    "Apply Filters" (the original refetched on every keystroke)
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
  { key: 'borrower', icon: 'account', label: 'Borrower', get: (r) => r.loanDetails?.borrower || 'N/A' },
  { key: 'loanAmount', icon: 'bank', label: 'Loan Amount', get: (r) => money(r.loanDetails?.loanAmount) },
  { key: 'transaction', icon: 'receipt', label: 'Transaction', get: (r) => r.transactionId || 'N/A' },
  { key: 'note', icon: 'information', label: 'Note', get: (r) => r.logicNote || r.LogicNote || 'N/A' },
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

const ActionButton = ({ label, icon, bg, onPress, disabled }) => (
  <Pressable
    style={({ pressed }) => [
      styles.actionBtn,
      { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
    ]}
    onPress={onPress}
    disabled={disabled}
    hitSlop={4}
  >
    <Icon name={icon} size={18} color={colors.white} />
    <Text style={styles.actionText}>{label}</Text>
  </Pressable>
);

const RepaymentCard = React.memo(({ repayment, approveLoading, onAction }) => (
  <Card style={styles.repaymentCard}>
    <View style={styles.repaymentHeader}>
      <Text style={styles.amount}>{money(repayment.amount)}</Text>
      <StatusPill status={repayment.status} />
    </View>
    <View style={styles.detailGrid}>
      {DETAIL_ROWS.map((row) => (
        <DetailCell key={row.key} icon={row.icon} label={row.label} value={row.get(repayment)} />
      ))}
    </View>
    {repayment.status !== 'Approved' && (
      <View style={styles.actions}>
        <ActionButton
          label="Reject"
          icon="close-circle-outline"
          bg={colors.danger}
          disabled={approveLoading}
          onPress={() => onAction(repayment._id, 'reject')}
        />
        <ActionButton
          label="Approve"
          icon="check-circle-outline"
          bg={colors.success}
          disabled={approveLoading}
          onPress={() => onAction(repayment._id, 'approve')}
        />
      </View>
    )}
  </Card>
));

const RepaymentApprovalScreen = () => {
  const navigation = useNavigation();

  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState(new Set());
  const [filters, setFilters] = useState({
    loanNumber: '',
    defaultDate: true,
    date: new Date(),
    status: '',
  });
  const [draft, setDraft] = useState(null);

  const fetchRepayments = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page,
        limit: 1000,
        defaultDate: filters.defaultDate,
        date: filters.date.toISOString().split('T')[0],
        status: filters.status,
        ...(filters.loanNumber && { loanNumber: filters.loanNumber }),
      });

      const response = await apiCall(`/api/admin/loan/repayment/history/approve?${queryParams}`, 'GET');

      if (response.status === 'success' && Array.isArray(response.data)) {
        setRepayments((prev) => [...prev, ...response.data]);
        setHasMore(response.data.length === 10);
        setPage((prev) => prev + 1);
      } else {
        showToast('error', 'Failed to fetch repayments');
      }
    } catch (error) {
      showToast('error', 'Failed to fetch repayments');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters, loading, hasMore, reloadKey]);

  useEffect(() => { fetchRepayments(); }, [fetchRepayments]);

  const groupedRepayments = useMemo(() => {
    const grouped = repayments.reduce((acc, repayment) => {
      const collectorName = repayment.collectedBy || 'Unknown (Admin)';
      const date = new Date(repayment.paymentDate).toLocaleDateString();

      if (!acc[collectorName]) acc[collectorName] = {};
      if (!acc[collectorName][date]) acc[collectorName][date] = [];

      acc[collectorName][date].push(repayment);
      return acc;
    }, {});

    return Object.entries(grouped).map(([collector, dates]) => ({
      collector,
      data: Object.entries(dates).map(([date, items]) => ({
        date,
        items,
        totalAmount: items.reduce((sum, item) => sum + Number(item.amount), 0),
        count: items.length,
      })),
    }));
  }, [repayments]);

  const toggleSection = (collectorName) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(collectorName)) next.delete(collectorName);
      else next.add(collectorName);
      return next;
    });
  };

  const handleAction = (repaymentId, action) => {
    const confirmMessage = action === 'approve'
      ? 'Are you sure you want to approve this repayment?'
      : 'Are you sure you want to reject this repayment?';

    Alert.alert(
      `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          onPress: async () => {
            setApproveLoading(true);
            try {
              const endpoint = action === 'approve' ? 'approve' : 'reject';
              const response = await apiCall(`/api/admin/loan/repayment/history/${endpoint}`, 'POST', { repaymentId });

              if (response.status === 'success') {
                showToast('success', `Repayment ${action}ed successfully`);
                setRepayments([]);
                setPage(1);
                setHasMore(true);
                setReloadKey((k) => k + 1);
              }
            } catch (error) {
              showToast('error', `Failed to ${action} repayment`);
            } finally {
              setApproveLoading(false);
            }
          },
        },
      ]
    );
  };

  const openFilters = () => {
    setDraft({ ...filters, date: new Date(filters.date) });
    setShowFilters(true);
  };

  const closeFilters = () => {
    setShowFilters(false);
    setDraft(null);
  };

  const applyFilters = () => {
    setShowFilters(false);
    setDraft(null);
    setFilters({
      loanNumber: draft.loanNumber,
      defaultDate: draft.defaultDate,
      date: draft.date,
      status: draft.status,
    });
    setRepayments([]);
    setPage(1);
    setHasMore(true);
    setReloadKey((k) => k + 1);
  };

  const renderSectionHeader = ({ section }) => {
    const isCollapsed = collapsedSections.has(section.collector);
    const totalCount = section.data.reduce((sum, d) => sum + d.count, 0);
    const totalAmount = section.data.reduce((sum, d) => sum + d.totalAmount, 0);

    return (
      <Pressable
        style={styles.sectionHeader}
        onPress={() => toggleSection(section.collector)}
        hitSlop={4}
      >
        <View style={styles.sectionChip}>
          <Icon name="account-cash" size={16} color={colors.accentDeep} />
        </View>
        <View style={styles.sectionText}>
          <Text style={styles.collectorName} numberOfLines={1}>{section.collector}</Text>
          <Text style={styles.sectionMeta}>
            {totalCount} collection{totalCount === 1 ? '' : 's'} · ₹{totalAmount.toLocaleString()}
          </Text>
        </View>
        <Icon name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={22} color={colors.inkMuted} />
      </Pressable>
    );
  };

  return (
    <Screen bg={colors.bg}>
      <View style={styles.controls}>
        <Button
          label="Filters"
          icon="filter"
          variant="accent"
          size="sm"
          style={{ flex: 0.48 }}
          onPress={openFilters}
        />
        <Button
          label="Old Version"
          icon="swap-horizontal"
          variant="outline"
          size="sm"
          style={{ flex: 0.48 }}
          onPress={() => navigation.navigate('OldRepaymentApproval')}
        />
      </View>

      <SectionList
        sections={groupedRepayments}
        keyExtractor={(item, index) => `${item.date}-${index}`}
        renderItem={({ item, section }) =>
          !collapsedSections.has(section.collector) && (
            <View style={styles.dateSection}>
              <View style={styles.dateSectionHeader}>
                <Text style={styles.dateText}>{item.date}</Text>
                <View style={styles.dateSummary}>
                  <Text style={styles.summaryText}>Total: ₹{item.totalAmount.toLocaleString()}</Text>
                  <Text style={styles.summaryText}>Collections: {item.count}</Text>
                </View>
              </View>
              {item.items.map((repayment, repaymentIndex) => (
                <RepaymentCard
                  key={`${repayment._id || 'r'}-${repaymentIndex}`}
                  repayment={repayment}
                  approveLoading={approveLoading}
                  onAction={handleAction}
                />
              ))}
            </View>
          )
        }
        renderSectionHeader={renderSectionHeader}
        onEndReached={fetchRepayments}
        onEndReachedThreshold={0.1}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          loading ? (
            <View style={styles.footer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="clipboard-check"
              title="No repayments to approve"
              subtitle="Pending repayments collected by the field team will appear here."
              style={{ marginTop: spacing.xxl }}
            />
          ) : null
        }
      />

      {showFilters && draft ? (
        <Modal visible transparent animationType="slide" onRequestClose={closeFilters}>
          <View style={styles.overlay}>
            <SafeAreaView style={styles.sheet}>
              <View style={styles.grabber} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Filters</Text>
                <Pressable style={styles.closeBtn} onPress={closeFilters} hitSlop={8}>
                  <Icon name="close" size={20} color={colors.inkSecondary} />
                </Pressable>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.xl }}>
                <View style={styles.field}>
                  <TextField
                    label="Loan Number (optional)"
                    placeholder="e.g. LN-000123"
                    value={draft.loanNumber}
                    onChangeText={(loanNumber) => setDraft((prev) => ({ ...prev, loanNumber }))}
                  />
                </View>

                <View style={styles.toggleRow}>
                  <View style={styles.toggleLabel}>
                    <Text style={type.bodyBold}>Use Default Date</Text>
                    <Text style={[type.sub, { color: colors.inkMuted }]}>
                      Today instead of a custom date
                    </Text>
                  </View>
                  <Switch
                    value={draft.defaultDate}
                    onValueChange={(defaultDate) => setDraft((prev) => ({ ...prev, defaultDate }))}
                    trackColor={{ true: colors.accent, false: colors.borderStrong }}
                    thumbColor={colors.white}
                  />
                </View>

                {!draft.defaultDate && (
                  <View style={styles.field}>
                    <Pressable style={styles.dateBtn} onPress={() => setShowDatePicker(true)} hitSlop={6}>
                      <Icon name="calendar" size={18} color={colors.inkSecondary} />
                      <Text style={styles.dateBtnText}>{new Date(draft.date).toLocaleDateString()}</Text>
                      <Icon name="chevron-right" size={18} color={colors.inkMuted} style={{ marginLeft: 'auto' }} />
                    </Pressable>
                  </View>
                )}

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={draft.status}
                      onValueChange={(status) => setDraft((prev) => ({ ...prev, status }))}
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
                  style={{ marginTop: spacing.lg }}
                  onPress={applyFilters}
                />
              </ScrollView>

              <CustomToast />
            </SafeAreaView>
          </View>
        </Modal>
      ) : null}

      {showDatePicker && (
        <DateTimePicker
          value={draft ? new Date(draft.date) : new Date()}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDraft((prev) => (prev ? { ...prev, date: selectedDate } : prev));
          }}
        />
      )}

      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
    marginBottom: spacing.xs,
    zIndex: 1,
  },
  sectionChip: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  sectionText: {
    flex: 1,
  },
  collectorName: {
    ...type.bodyBold,
    color: colors.ink,
  },
  sectionMeta: {
    ...type.sub,
    color: colors.inkMuted,
    marginTop: 1,
  },
  dateSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  dateText: {
    ...type.bodyBold,
    color: colors.accentDeep,
  },
  dateSummary: {
    alignItems: 'flex-end',
  },
  summaryText: {
    ...type.sub,
    color: colors.inkSecondary,
  },
  repaymentCard: {
    marginBottom: spacing.sm,
  },
  repaymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  amount: {
    ...type.h2,
    color: colors.ink,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
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
    marginBottom: 3,
  },
  detailLabel: {
    ...type.caption,
    color: colors.inkMuted,
    marginLeft: 5,
    flexShrink: 1,
  },
  detailValue: {
    ...type.body,
    color: colors.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  actionText: {
    ...type.bodyBold,
    color: colors.white,
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
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
    backgroundColor: colors.inkFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...type.caption,
    color: colors.inkSecondary,
    marginBottom: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  toggleLabel: {
    flex: 1,
    marginRight: spacing.sm,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  dateBtnText: {
    ...type.body,
    color: colors.ink,
    marginLeft: spacing.sm,
    flex: 1,
  },
  pickerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.sm,
  },
  picker: {
    flex: 1,
    height: 50,
    color: colors.ink,
  },
});

export default RepaymentApprovalScreen;

