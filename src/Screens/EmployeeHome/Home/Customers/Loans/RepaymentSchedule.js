import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiCall } from '../../../../../components/api/apiUtils';
import { useRoute } from '@react-navigation/native';
import Icon from '../../../../../design/Icon';
import Card from '../../../../../design/components/Card';
import Button from '../../../../../design/components/Button';
import TextField from '../../../../../design/components/TextField';
import EmptyState from '../../../../../design/components/EmptyState';
import Skeleton from '../../../../../design/components/Skeleton';
import { colors, spacing, radius, type } from '../../../../../design/tokens';

/**
 * Employee repayment-schedule list — rebuilt on the "Ink & Amber" design
 * system.
 *  - behaviour preserved 1:1: the same paginated
 *    /api/admin/loan/repayment/schedule fetch (page / loanId / searchTerm /
 *    statusFilter / dateFrom / dateTo query params), the append-with-dedup
 *    pagination, the filter sheet (search + status Picker + from/to
 *    DateTimePicker rows with a shared clear), Apply Filters, Load More
 *    footer, and the Alert on fetch failure
 *  - status colours mapped to the semantic tokens: paid → success,
 *    pending → warning, overdue → danger, anything else → neutral (the
 *    original's purple default)
 *  - design: surface cards with icon chips, a status badge row, a filter
 *    sheet with the design TextField/Picker/Button, skeletons on first
 *    load and a proper empty state
 */

const STATUS_CONFIG = {
  paid: { bg: colors.successSoft, fg: colors.successInk },
  pending: { bg: colors.warningSoft, fg: colors.warningInk },
  overdue: { bg: colors.dangerSoft, fg: colors.dangerInk },
};

const getStatusConfig = (status) =>
  STATUS_CONFIG[String(status || '').toLowerCase()] || {
    bg: colors.neutralSoft,
    fg: colors.neutralInk,
  };

const StatusBadge = ({ status, style }) => {
  const config = getStatusConfig(status);
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }, style]}>
      <View style={[styles.statusDot, { backgroundColor: config.fg }]} />
      <Text style={[styles.statusBadgeText, { color: config.fg }]} numberOfLines={1}>
        {status || 'N/A'}
      </Text>
    </View>
  );
};

const LoadingList = () => (
  <View style={styles.page}>
    {[0, 1, 2].map((i) => (
      <Card key={i} padded={false} style={{ marginBottom: spacing.md }}>
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Skeleton width={36} height={36} radius={radius.md} />
            <Skeleton width="45%" height={16} />
            <Skeleton width="22%" height={24} radius={radius.full} />
          </View>
          <Skeleton width="70%" height={12} />
          <Skeleton width="50%" height={12} />
        </View>
      </Card>
    ))}
  </View>
);

const RepaymentSchedule = () => {
  const [repaymentSchedules, setRepaymentSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  const route = useRoute();
  const { loanId } = route.params || {};

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
      const { data } = response;

      setTotalEntries(data.totalEntries || 0);

      if (data && Array.isArray(data.repaymentSchedule)) {
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
    if (page < totalPages) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const handleClearDateRange = () => {
    setDateFrom(null);
    setDateTo(null);
  };

  const renderItem = useCallback(
    ({ item }) => {
      const penaltyApplied = item.penaltyApplied;
      return (
        <Card elevation="subtle" style={{ marginBottom: spacing.md }}>
          <View style={styles.itemHeader}>
            <View style={styles.dateChip}>
              <Icon name="calendar-month-outline" size={20} color={colors.accentDeep} />
            </View>
            <Text style={styles.dueDate} numberOfLines={1}>
              {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'}
            </Text>
            <StatusBadge status={item.status} style={{ marginLeft: spacing.sm }} />
          </View>

          <View style={styles.itemRows}>
            <View style={styles.itemRow}>
              <Icon name="currency-inr" size={18} color={colors.successInk} />
              <Text style={styles.itemValue}>
                {item.amount != null ? `₹${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A'}
              </Text>
            </View>
            <View style={styles.itemRow}>
              <Icon name="clock-alert-outline" size={18} color={penaltyApplied ? colors.dangerInk : colors.inkMuted} />
              <Text style={[styles.itemValue, penaltyApplied ? { color: colors.dangerInk } : { color: colors.inkSecondary }]}>
                Penalty: {penaltyApplied ? `₹${item.penalty?.amount || '0'}` : 'N/A'}
              </Text>
            </View>
          </View>
        </Card>
      );
    },
    []
  );

  const renderDatePicker = (showPicker, setShowPicker, currentDate, setDate, label) => (
    <View style={styles.datePickerContainer}>
      <View style={styles.datePickerButton}>
        <Icon name="calendar-search" size={20} color={colors.accentDeep} />
        <Text style={styles.datePickerLabel}>
          {label}: {currentDate ? currentDate.toDateString() : 'Select Date'}
        </Text>
        <TouchableOpacity onPress={handleClearDateRange} style={styles.dateClearBtn} activeOpacity={0.6}>
          <Icon name="close" size={16} color={colors.inkMuted} />
        </TouchableOpacity>
      </View>
      {showPicker && (
        <DateTimePicker
          value={currentDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) {
              setDate(selectedDate);
            }
          }}
        />
      )}
    </View>
  );

  const applyFilters = () => {
    setPage(1);
    setRepaymentSchedules([]);
    fetchRepaymentSchedules();
    setShowFilterModal(false);
  };

  if (loading && repaymentSchedules.length === 0) {
    return <LoadingList />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTotal}>
            Total: {totalEntries}
          </Text>
          <Text style={styles.headerShowing}>Currently Showing: {repaymentSchedules.length}</Text>
        </View>
        <Button
          label="Filter"
          icon="filter-check-outline"
          variant="outline"
          size="sm"
          onPress={() => setShowFilterModal(true)}
        />
      </View>

      <FlatList
        data={repaymentSchedules}
        renderItem={renderItem}
        keyExtractor={(item, index) => item._id || item.id || `repayment-${index}`}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.accentDeep} />
            </View>
          ) : page < totalPages ? (
            <Button
              label="Load More"
              variant="ghost"
              size="sm"
              full
              style={{ marginTop: spacing.sm }}
              onPress={loadMore}
            />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-month-outline"
            title="No repayment schedules available"
            style={{ marginTop: spacing.xxxl }}
          />
        }
        contentContainerStyle={styles.page}
      />

      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.closeButton}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Icon name="close-outline" size={22} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <TextField
              label="Search"
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search..."
              leftIcon="search"
            />

            <View style={styles.pickerWrap}>
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={statusFilter}
                  onValueChange={(itemValue) => setStatusFilter(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="All Statuses" value="" />
                  <Picker.Item label="Pending" value="pending" />
                  <Picker.Item label="Paid" value="paid" />
                  <Picker.Item label="Overdue" value="overdue" />
                </Picker>
                <Icon name="chevron-down" size={18} color={colors.inkMuted} />
              </View>
            </View>

            {renderDatePicker(showFromDatePicker, setShowFromDatePicker, dateFrom, setDateFrom, 'From Date')}
            {renderDatePicker(showToDatePicker, setShowToDatePicker, dateTo, setDateTo, 'To Date')}

            <Button
              label="Apply Filters"
              icon="check"
              variant="accent"
              full
              onPress={applyFilters}
              style={{ marginTop: spacing.xs }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  page: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTotal: {
    ...type.bodyBold,
    color: colors.ink,
  },
  headerShowing: {
    ...type.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },

  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateChip: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueDate: {
    ...type.bodyBold,
    color: colors.ink,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    ...type.caption,
    fontWeight: '700',
  },
  itemRows: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs + 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemValue: {
    ...type.body,
    color: colors.ink,
    flex: 1,
  },

  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },

  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    width: '90%',
    maxHeight: '80%',
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    ...type.h2,
    color: colors.ink,
  },
  closeButton: {
    padding: spacing.xs,
  },
  pickerWrap: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...type.sub,
    color: colors.inkSecondary,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingRight: spacing.sm,
  },
  picker: {
    flex: 1,
    height: 48,
    color: colors.ink,
  },
  datePickerContainer: {
    gap: spacing.xs,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  datePickerLabel: {
    ...type.body,
    color: colors.inkSecondary,
    flex: 1,
  },
  dateClearBtn: {
    padding: 4,
  },
});

export default RepaymentSchedule;
