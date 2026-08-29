import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, Pressable, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiCall } from '../../../../components/api/apiUtils';
import { useRoute, useNavigation } from '@react-navigation/native';
import { showToast, CustomToast } from '../../../../components/toast/CustomToast';
import Screen from '../../../../design/components/Screen';
import Card from '../../../../design/components/Card';
import Button from '../../../../design/components/Button';
import TextField from '../../../../design/components/TextField';
import EmptyState from '../../../../design/components/EmptyState';
import Icon from '../../../../design/Icon';
import { colors, spacing, radius, type } from '../../../../design/tokens';
import EditRepaymentScheduleModal from './EditRepaymentScheduleModal';

/**
 * RepaymentSchedule — admin per-installment schedule rebuilt on the
 * "Ink & Amber" design system.
 *  - Card rows per installment (due date, #, payment/original amount,
 *    semantic status, penalty, logic note, nested repayment history)
 *    with an icon-led edit action
 *  - filter bottom sheet (search / status / date range) and the original
 *    page+totalPages pagination, dedupe-on-append logic and load-more
 *  - endpoints preserved exactly: GET /api/admin/loan/repayment/schedule
 *    (URLSearchParams) and the update POST in handleSaveSchedule
 */

const STATUS_COLOR = {
  paid: colors.success,
  pending: colors.warning,
  overdue: colors.danger,
  overduepaid: colors.warningInk,
  advancepaid: colors.info,
  partiallypaid: colors.warning,
  partiallypaidfullypaid: colors.warningInk,
  approved: colors.success,
};

const STATUS_ICON = {
  paid: 'check-circle',
  pending: 'clock',
  overdue: 'alert-circle',
  overduepaid: 'check-circle',
  advancepaid: 'calendar-check',
  partiallypaid: 'check-circle',
  partiallypaidfullypaid: 'check-circle',
  approved: 'check-circle',
};

const getStatusColor = (status) => STATUS_COLOR[status?.toLowerCase()] || colors.inkMuted;
const getStatusIcon = (status) => STATUS_ICON[status?.toLowerCase()] || 'info';

const DetailLine = ({ icon, iconColor, children, color }) => (
  <View style={styles.line}>
    <Icon name={icon} size={16} color={iconColor} />
    <Text numberOfLines={1} style={[type.body, { color: color || colors.inkSecondary, flex: 1 }]}>{children}</Text>
  </View>
);

const RepaymentTile = ({ repayment }) => (
  <View style={styles.repaymentTile}>
    <View style={styles.repaymentLine}>
      <Text style={[type.sub, { color: colors.inkSecondary }]}>
        ₹{repayment.amount ?? '—'} · {new Date(repayment.paymentDate).toLocaleDateString()}
      </Text>
      <Text style={[type.sub, { color: getStatusColor(repayment.status), fontWeight: 600 }]}>
        {repayment.status || '—'}
      </Text>
    </View>
    <View style={styles.repaymentLine}>
      <Text style={[type.sub, { color: colors.inkSecondary }]}>
        {repayment.paymentMethod || '—'}
      </Text>
      {repayment.transactionId ? (
        <Text numberOfLines={1} style={[type.sub, { color: colors.inkMuted }]}>
          Txn {repayment.transactionId}
        </Text>
      ) : null}
    </View>
    <Text style={[type.sub, { color: colors.inkMuted }]}>
      Collected by {repayment.collectedBy
        ? `${repayment.collectedBy.fname} ${repayment.collectedBy.lname}`
        : 'Admin'}
    </Text>
  </View>
);

const ScheduleRow = ({ item, loanClosed, onEdit }) => {
  const statusColor = getStatusColor(item.status);
  return (
    <Card style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={styles.dateChip}>
          <Icon name="calendar" size={16} color={colors.accentDeep} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[type.bodyBold, { color: colors.ink, fontSize: 16 }]}>
            {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'}
          </Text>
          <Text style={[type.sub, { color: colors.inkMuted, marginTop: 1 }]}>
            Installment #{item.loanInstallmentNumber || '—'}
          </Text>
        </View>
        <Pressable hitSlop={8} style={styles.editButton} onPress={onEdit}>
          <Icon name="pencil" size={17} color={colors.accentDeep} />
        </Pressable>
      </View>

      <View style={styles.lines}>
        <DetailLine icon="currency-inr" iconColor={colors.successInk}>
          Payment Amount: <Text style={{ color: colors.ink, fontWeight: 600 }}>₹{item.amount || 'N/A'}</Text>
        </DetailLine>
        <DetailLine icon="bills" iconColor={colors.infoInk}>
          Original EMI: <Text style={{ color: colors.ink, fontWeight: 600 }}>₹{item.originalAmount || 'N/A'}</Text>
        </DetailLine>
        <View style={styles.line}>
          <Icon name={getStatusIcon(item.status)} size={16} color={statusColor} />
          <Text style={[type.body, { color: statusColor, fontWeight: 600 }]}>
            {item.status || 'N/A'}
          </Text>
        </View>
        <DetailLine
          icon="alert-circle"
          iconColor={item.penaltyApplied ? colors.danger : colors.inkMuted}
          color={item.penaltyApplied ? colors.dangerInk : colors.inkSecondary}
        >
          Penalty: {item.penaltyApplied ? `₹${item.penalty?.amount || '0'}` : 'N/A'}
        </DetailLine>
        <DetailLine icon="notebook" iconColor={colors.inkMuted}>
          {item.logicNote || item.LogicNote || 'No logical note'}
        </DetailLine>
      </View>

      {item.repayments && item.repayments.length > 0 && (
        <View style={styles.repaymentsBlock}>
          <Text style={[type.caption, { color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.6 }]}>
            Repayments ({item.repayments.length})
          </Text>
          {item.repayments.map((repayment, index) => (
            <RepaymentTile key={repayment?._id || index} repayment={repayment} />
          ))}
        </View>
      )}

      {loanClosed ? (
        <View style={styles.closedBanner}>
          <Icon name="lock-check" size={15} color={colors.neutralInk} />
          <Text style={[type.caption, { color: colors.neutralInk, marginLeft: 6, fontWeight: 600 }]}>
            Loan Closed
          </Text>
        </View>
      ) : null}
    </Card>
  );
};

const DateField = ({ label, value, onChange, onClear }) => {
  const [showPicker, setShowPicker] = useState(false);
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[type.caption, { color: colors.inkSecondary, marginBottom: 6 }]}>{label}</Text>
      <View style={styles.dateRow}>
        <Pressable
          onPress={() => setShowPicker(true)}
          style={({ pressed }) => [styles.dateButton, pressed && { opacity: 0.85 }]}
        >
          <Icon name="calendar" size={20} color={value ? colors.accentDeep : colors.inkMuted} />
          <Text style={[type.body, { color: value ? colors.ink : colors.inkMuted, marginLeft: 8, flex: 1, textAlign: 'left' }]}>
            {value ? value.toDateString() : 'Select date'}
          </Text>
        </Pressable>
        {value ? (
          <Pressable
            hitSlop={8}
            onPress={onClear}
            style={({ pressed }) => [styles.clearButton, pressed && { opacity: 0.6 }]}
          >
            <Icon name="close" size={14} color={colors.inkSecondary} />
          </Pressable>
        ) : null}
      </View>
      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) onChange(selectedDate);
          }}
        />
      )}
    </View>
  );
};

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
];

const RepaymentSchedule = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { loanId } = route.params || {};

  const [repaymentSchedules, setRepaymentSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loanStatus, setLoanStatus] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRepaymentSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchRepaymentSchedules = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page,
        loanId,
        ...(searchTerm && { searchTerm }),
        ...(statusFilter && { statusFilter }),
        ...(dateFrom && { dateFrom: dateFrom.toISOString() }),
        ...(dateTo && { dateTo: dateTo.toISOString() }),
      }).toString();

      const response = await apiCall(`/api/admin/loan/repayment/schedule?${queryParams}`, 'GET');
      const data = response?.data || {};
      setLoanStatus(data.loanStatus || '');
      setTotalEntries(data.totalEntries || 0);

      if (Array.isArray(data.repaymentSchedule)) {
        const newSchedules = data.repaymentSchedule;
        setRepaymentSchedules((prevSchedules) => {
          const existingIds = new Set(prevSchedules.map((item) => item._id || item.id));
          const filteredNewSchedules = newSchedules.filter((item) => !existingIds.has(item._id || item.id));
          return [...prevSchedules, ...filteredNewSchedules];
        });
        setTotalPages(data.totalPages || 1);
      } else {
        console.error('Invalid data structure:', data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch repayment schedules. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (page < totalPages) setPage((prevPage) => prevPage + 1);
  };

  const handleEditSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setShowEditModal(true);
  };

  const handleSaveSchedule = async (updatedSchedule) => {
    try {
      setSaving(true);
      const payload = {
        id: updatedSchedule.id, // original code sends `id` here
        status: updatedSchedule.status,
        amount: updatedSchedule.amount,
        paymentDate: updatedSchedule.paymentDate,
        paymentMethod: updatedSchedule.paymentMethod,
        penaltyAmount: updatedSchedule.penaltyAmount,
        penaltyReason: updatedSchedule.penaltyReason,
        penaltyAppliedDate: updatedSchedule.penaltyAppliedDate,
        transactionId: updatedSchedule.transactionId,
        collectedBy: updatedSchedule.collectedBy,
      };

      const response = await apiCall('/api/admin/loan/repayment/schedule/update', 'POST', payload);
      if (response.status === 'success') {
        setShowEditModal(false);
        navigation.goBack();
        showToast('success', 'Success', 'Repayment schedule updated successfully');
      } else {
        showToast('error', 'Error', response.message || 'Failed to update repayment schedule');
      }
    } catch (error) {
      console.error('Error updating repayment schedule:', error);
      Alert.alert('Error', 'Failed to update repayment schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const applyFilters = () => {
    setShowFilterModal(false);
    setRepaymentSchedules([]);
    if (page !== 1) {
      // the [page] effect below triggers the re-fetch — calling it again
      // here would double-fetch (latent bug in the original flow)
      setPage(1);
    } else {
      fetchRepaymentSchedules();
    }
  };

  const renderFooter = () => (
    <View style={styles.footer}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.inkMuted} />
      ) : page < totalPages ? (
        <Button label="Load More" variant="outline" icon="chevron-down" onPress={loadMore} />
      ) : null}
    </View>
  );

  return (
    <Screen bg={colors.bg}>
      <View style={styles.headerBar}>
        <View style={{ flex: 1 }}>
          <Text style={[type.bodyBold, { color: colors.ink }]}>
            {totalEntries} installment{totalEntries === 1 ? '' : 's'}
          </Text>
          <Text style={[type.sub, { color: colors.inkMuted, marginTop: 1 }]}>
            Showing {repaymentSchedules.length}
          </Text>
        </View>
        <Pressable
          onPress={() => setShowFilterModal(true)}
          style={({ pressed }) => [styles.filterButton, pressed && { opacity: 0.85 }]}
        >
          <Icon name="filter" size={18} color={colors.inkSecondary} />
          <Text style={[type.caption, { color: colors.inkSecondary, marginLeft: 6 }]}>Filter</Text>
        </Pressable>
      </View>

      <FlatList
        data={repaymentSchedules}
        renderItem={({ item }) => (
          <ScheduleRow
            item={item}
            loanClosed={(loanStatus || '').toLowerCase() === 'closed'}
            onEdit={() => handleEditSchedule(item)}
          />
        )}
        keyExtractor={(item, index) => item._id || item.id || `repayment-${index}`}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="calendar"
              title="No repayment schedules"
              subtitle="Installments will appear here once the loan is generated."
              style={{ marginTop: spacing.xxl }}
            />
          ) : (
            <View style={styles.initialLoading}>
              <ActivityIndicator size="large" color={colors.inkMuted} />
            </View>
          )
        }
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={[type.title, { color: colors.ink }]}>Filter Schedules</Text>
              <Pressable hitSlop={8} onPress={() => setShowFilterModal(false)}>
                <Icon name="close" size={20} color={colors.inkSecondary} />
              </Pressable>
            </View>

            <TextField
              label="Search"
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search…"
              leftIcon="search"
            />
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[type.caption, { color: colors.inkSecondary, marginBottom: 6 }]}>Status</Text>
              <View style={styles.pickerWrap}>
                <Icon name="filter" size={20} color={colors.inkMuted} />
                <Picker
                  selectedValue={statusFilter}
                  onValueChange={setStatusFilter}
                  style={[styles.picker, statusFilter === '' && { color: colors.inkMuted }]}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <Picker.Item key={option.value || 'all'} label={option.label} value={option.value} />
                  ))}
                </Picker>
                <Icon name="chevron-down" size={18} color={colors.inkMuted} />
              </View>
            </View>
            <DateField label="From Date" value={dateFrom} onChange={setDateFrom} onClear={() => setDateFrom(null)} />
            <DateField label="To Date" value={dateTo} onChange={setDateTo} onClear={() => setDateTo(null)} />
            <Button label="Apply Filters" icon="check-circle" variant="accent" size="lg" full onPress={applyFilters} />
          </View>
        </View>
      </Modal>

      <EditRepaymentScheduleModal
        visible={showEditModal}
        saving={saving}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveSchedule}
        scheduleItem={selectedSchedule}
      />
      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.inkFaint,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  row: {
    marginBottom: spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateChip: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    padding: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lines: {
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  repaymentsBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  repaymentTile: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
  },
  repaymentLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.neutralSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  initialLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxxl,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
    height: 54,
    color: colors.ink,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.sm,
    paddingVertical: spacing.md - 2,
  },
  clearButton: {
    padding: 6,
    borderRadius: radius.full,
    backgroundColor: colors.inkFaint,
    marginRight: spacing.xs,
  },
});

export default RepaymentSchedule;
