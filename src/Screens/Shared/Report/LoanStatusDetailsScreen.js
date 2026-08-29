import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast } from '../../../components/toast/CustomToast';
import CustomToast from '../../../components/toast/CustomToast';
import { handleSendSMS } from '../../../components/sms/sendSMS';
import { useHomeContext } from '../../../components/context/HomeContext';
import Card from '../../../design/components/Card';
import Button from '../../../design/components/Button';
import TextField from '../../../design/components/TextField';
import StatusPill from '../../../design/components/StatusPill';
import EmptyState from '../../../design/components/EmptyState';
import Skeleton from '../../../design/components/Skeleton';
import Icon from '../../../design/Icon';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * LoanStatusDetailsScreen (NPA / SMA drill-down) — rebuilt on the "Ink &
 * Amber" design system.
 *  - behaviour preserved 1:1: the same paginated
 *    /api/shared/loan/status?includeCustomer=true fetch (smaLevel / npa
 *    params + assignedTo=me), the repayment-schedule modal
 *    (?includeRepaymentSchedule=true), the /api/employee/loan/pay/old
 *    payment flow, the SMS confirmation Alert, pull-to-refresh and
 *    load-more, and the employee-only "Pay Now" gating (userRole check)
 *  - every toast keeps its original argument count and message
 *  - design: surface cards with icon detail rows + a 3-up amount strip,
 *    semantic StatusPills for installment status, design Button/TextField
 *    in the payment sheet, skeletons while loading and a proper empty
 *    state (the old build just showed a blank list)
 */

const DetailRow = ({ icon, text }) => (
  <View style={styles.detailRow}>
    <Icon name={icon} size={16} color={colors.inkMuted} />
    <Text style={styles.detailText} numberOfLines={1}>
      {text || '—'}
    </Text>
  </View>
);

const MoneyStat = ({ label, value, danger }) => (
  <View style={styles.statItem}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, danger && { color: colors.danger }]} numberOfLines={1}>
      ₹{Number(value || 0).toLocaleString()}
    </Text>
  </View>
);

const LoadingList = () => (
  <View style={styles.listPadding}>
    {[0, 1, 2].map((i) => (
      <Card key={i} padded={false} style={{ marginBottom: spacing.md }}>
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Skeleton width="40%" height={12} />
          <Skeleton width="60%" height={16} />
          <View style={{ height: spacing.xs }} />
          <Skeleton width="80%" height={12} />
          <Skeleton width="65%" height={12} />
          <View style={{ height: spacing.xs }} />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Skeleton width="28%" height={28} />
            <Skeleton width="28%" height={28} />
            <Skeleton width="28%" height={28} />
          </View>
        </View>
      </Card>
    ))}
  </View>
);

const LoanStatusDetailsScreen = ({ route, navigation }) => {
  const { type, smaLevel, assignedTo } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [scheduleData, setScheduleData] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [confirmPaymentLoading, setConfirmPaymentLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalResults: 0,
  });
  const [paymentDetails, setPaymentDetails] = useState({
    amount: '',
    paymentMethod: 'Cash',
    transactionId: '',
  });

  const { userRole } = useHomeContext();

  const fetchData = async (page = 1, shouldAppend = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      let url = `/api/shared/loan/status?includeCustomer=true&page=${page}`;
      if (type === 'sma') {
        url += assignedTo ? `&smaLevel=${smaLevel}&assignedTo=me` : `&smaLevel=${smaLevel}`;
      } else if (type === 'npa') {
        url += assignedTo ? '&npa=true&assignedTo=me' : '&npa=true';
      }

      const response = await apiCall(url);
      if (!response.error) {
        setData(shouldAppend ? [...data, ...response.data] : response.data);
        setPagination(response.pagination);
      } else {
        showToast('error', response.message);
      }
    } catch (error) {
      showToast('error', 'Failed to fetch loan data');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const fetchRepaymentSchedule = async (loanId) => {
    try {
      const response = await apiCall(
        `/api/shared/loan/status?loanId=${loanId}&includeRepaymentSchedule=true`
      );
      if (!response.error && response.data.length > 0) {
        setScheduleData(response.data[0]);
      } else {
        showToast('error', 'No schedule data found');
      }
    } catch (error) {
      showToast('error', 'Failed to fetch repayment schedule');
    }
  };

  const handlePayButtonPress = (schedule) => {
    setSelectedSchedule(schedule);
    setPaymentDetails({
      amount: schedule.amount.toString(),
      paymentMethod: 'Cash',
      transactionId: '',
    });
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    try {
      setConfirmPaymentLoading(true);
      const response = await apiCall('/api/employee/loan/pay/old', 'POST', {
        loanId: selectedLoan._id,
        repaymentScheduleId: selectedSchedule._id,
        amount: parseFloat(paymentDetails.amount),
        paymentMethod: paymentDetails.paymentMethod,
        transactionId: paymentDetails.transactionId,
      });

      if (response.status === 'success') {
        showToast('success', 'Payment processed successfully');
        setShowPaymentModal(false);
        fetchRepaymentSchedule(selectedLoan._id);
        Alert.alert('Send SMS', 'Do you want to send SMS to customer?', [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: () =>
              handleSendSMS(
                selectedLoan.customer.phoneNumber,
                `Your loan payment of Rs. ${paymentDetails.amount} is successfully processed.`
              ),
          },
        ]);
      } else {
        showToast('error', `Failed to process payment: ${response.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      showToast('error', 'Failed to process payment');
    } finally {
      setConfirmPaymentLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    navigation.setOptions({
      title: type === 'sma' ? `SMA ${smaLevel} Details` : 'NPA Details',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = () => {
    if (!loadingMore && pagination.currentPage < pagination.totalPages && data.length > 0) {
      fetchData(pagination.currentPage + 1, true);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(1, false);
  };

  const openScheduleModal = async (loan) => {
    setSelectedLoan(loan);
    setShowScheduleModal(true);
    await fetchRepaymentSchedule(loan._id);
  };

  const renderLoanCard = ({ item }) => (
    <Card elevation="subtle" style={{ marginBottom: spacing.md }}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Text style={[type.caption, { color: colors.inkMuted }]} numberOfLines={1}>
            Loan #{item.loan.loanNumber}
          </Text>
          <Text style={styles.customerName} numberOfLines={1}>
            {`${item.loan.customer?.fname || ''} ${item.loan.customer?.lname || ''}`.trim() || 'Customer'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.scheduleButton}
          onPress={() => openScheduleModal(item.loan)}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Icon name="calendar-clock" size={18} color={colors.accentDeep} />
          <Text style={styles.scheduleButtonText}>Schedule</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.detailsContainer}>
        <DetailRow icon="phone" text={item.loan.customer?.phoneNumber} />
        <DetailRow icon="map-marker" text={item.loan.customer?.address} />
        <DetailRow icon="store" text={item.loan.businessAddress} />
      </View>

      <View style={styles.statsContainer}>
        <MoneyStat label="Loan Amount" value={item.loan.loanAmount} />
        <MoneyStat label="Overdue" value={item.totalOverdue} danger />
        <MoneyStat label="Total Paid" value={item.loan.totalPaid} />
      </View>
    </Card>
  );

  const renderScheduleItem = ({ item }) => {
    const canPay =
      ['Pending', 'Overdue', 'PartiallyPaid'].includes(item.status) && userRole === 'employee';

    return (
      <Card elevation="subtle" style={{ marginBottom: spacing.sm }}>
        <View style={styles.scheduleHeader}>
          <Text style={styles.installmentNumber}>#{item.loanInstallmentNumber}</Text>
          <StatusPill status={item.status} />
        </View>

        <View style={styles.scheduleDetails}>
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleLabel}>Due Date</Text>
            <Text style={styles.scheduleValue}>{format(new Date(item.dueDate), 'dd MMM yyyy')}</Text>
          </View>
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleLabel}>Amount</Text>
            <Text style={styles.scheduleValue}>₹{Number(item.amount).toLocaleString()}</Text>
          </View>
          {item.penaltyApplied ? (
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Penalty</Text>
              <Text style={[styles.scheduleValue, { color: colors.danger }]}>Applied</Text>
            </View>
          ) : null}
        </View>

        {canPay ? (
          <Button
            label="Pay Now"
            icon="cash"
            variant="accent"
            full
            onPress={() => handlePayButtonPress(item)}
            style={{ marginTop: spacing.md }}
          />
        ) : null}
      </Card>
    );
  };

  const renderScheduleModal = () => (
    <Modal
      visible={showScheduleModal}
      animationType="slide"
      onRequestClose={() => setShowScheduleModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Repayment Schedule</Text>
          <TouchableOpacity
            onPress={() => setShowScheduleModal(false)}
            style={styles.closeButton}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Icon name="close" size={22} color={colors.ink} />
          </TouchableOpacity>
        </View>

        {scheduleData ? (
          <FlatList
            data={scheduleData.repaymentSchedules}
            keyExtractor={(item) => item._id}
            renderItem={renderScheduleItem}
            contentContainerStyle={styles.listPadding}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.modalLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.modalLoadingText}>Loading schedule...</Text>
          </View>
        )}
        <CustomToast />
      </SafeAreaView>
    </Modal>
  );

  const renderPaymentModal = () => (
    <Modal
      visible={showPaymentModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <View style={styles.paymentModalOverlay}>
        <View style={styles.paymentModalContent}>
          <View style={styles.paymentModalHeader}>
            <Text style={styles.paymentModalTitle}>Process Payment</Text>
            <TouchableOpacity
              onPress={() => setShowPaymentModal(false)}
              style={styles.closeButton}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Icon name="close" size={22} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <TextField
            label="Amount"
            value={paymentDetails.amount}
            onChangeText={(text) => setPaymentDetails({ ...paymentDetails, amount: text })}
            keyboardType="numeric"
            leftIcon="cash"
            placeholder="₹ Amount"
          />

          <View style={styles.pickerWrap}>
            <Text style={styles.fieldLabel}>Payment Method</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={paymentDetails.paymentMethod}
                onValueChange={(value) => setPaymentDetails({ ...paymentDetails, paymentMethod: value })}
                style={styles.picker}
              >
                <Picker.Item label="Cash" value="Cash" />
                <Picker.Item label="Bank Transfer" value="Bank Transfer" />
                <Picker.Item label="Cheque" value="Cheque" />
                <Picker.Item label="GooglePay" value="GooglePay" />
                <Picker.Item label="PhonePay" value="PhonePay" />
                <Picker.Item label="Paytm" value="Paytm" />
                <Picker.Item label="Other" value="Other" />
              </Picker>
              <Icon name="chevron-down" size={18} color={colors.inkMuted} />
            </View>
          </View>

          <TextField
            label="Transaction ID"
            value={paymentDetails.transactionId}
            onChangeText={(text) => setPaymentDetails({ ...paymentDetails, transactionId: text })}
            leftIcon="receipt"
            placeholder="Enter transaction ID"
          />

          <Button
            label="Confirm Payment"
            icon="check"
            variant="accent"
            size="lg"
            full
            loading={confirmPaymentLoading}
            onPress={handlePayment}
            style={{ marginTop: spacing.sm }}
          />
        </View>
        <CustomToast />
      </View>
    </Modal>
  );

  if (loading && !data.length) {
    return (
      <View style={styles.container}>
        <LoadingList />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderLoanCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listPadding}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.inkMuted} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="file-search"
            title={type === 'sma' ? `No SMA ${smaLevel} loans` : 'No NPA loans'}
            subtitle="Loans in this status will show up here."
            style={{ marginTop: spacing.xxl }}
          />
        }
        ListFooterComponent={() =>
          loadingMore ? (
            <ActivityIndicator style={styles.footerLoader} size="small" color={colors.primary} />
          ) : null
        }
      />
      {renderScheduleModal()}
      {renderPaymentModal()}
      <CustomToast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listPadding: {
    padding: spacing.lg,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  customerName: {
    ...type.h2,
    color: colors.ink,
    marginTop: 2,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
  },
  scheduleButtonText: {
    ...type.sub,
    fontWeight: '600',
    color: colors.accentDeep,
    marginLeft: 6,
  },
  detailsContainer: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: spacing.sm,
    color: colors.inkSecondary,
    flex: 1,
    ...type.sub,
  },
  statsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    ...type.micro,
    color: colors.inkMuted,
    marginBottom: 2,
  },
  statValue: {
    ...type.bodyBold,
    color: colors.ink,
  },
  footerLoader: {
    marginVertical: spacing.lg,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...type.h2,
    color: colors.ink,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingText: {
    ...type.body,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  installmentNumber: {
    ...type.bodyBold,
    color: colors.ink,
  },
  scheduleDetails: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleLabel: {
    ...type.sub,
    color: colors.inkMuted,
  },
  scheduleValue: {
    ...type.sub,
    fontWeight: '600',
    color: colors.ink,
  },

  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentModalContent: {
    backgroundColor: colors.surface,
    width: '90%',
    borderRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '80%',
    gap: spacing.md,
  },
  paymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentModalTitle: {
    ...type.h2,
    color: colors.ink,
  },
  pickerWrap: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...type.sub,
    color: colors.inkSecondary,
    marginBottom: -spacing.xxs,
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
});

export default LoanStatusDetailsScreen;
