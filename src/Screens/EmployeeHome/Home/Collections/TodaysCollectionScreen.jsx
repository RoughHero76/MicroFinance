import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Modal, Image, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { apiCall } from '../../../../components/api/apiUtils';
import { showToast, CustomToast } from '../../../../components/toast/CustomToast';
import { handleSendSMS } from '../../../../components/sms/sendSMS';
import ProfilePicturePlaceHolder from '../../../../assets/placeholders/profile.jpg';
import ImageModal from '../../../../components/Image/ImageModal';
import Icon from '../../../../design/Icon';
import Card from '../../../../design/components/Card';
import Button from '../../../../design/components/Button';
import TextField from '../../../../design/components/TextField';
import EmptyState from '../../../../design/components/EmptyState';
import Skeleton from '../../../../design/components/Skeleton';
import { colors, spacing, radius, type } from '../../../../design/tokens';

/**
 * Today's collections — rebuilt on the "Ink & Amber" design system.
 *  - behaviour preserved 1:1: the /api/employee/loan/collection/today
 *    fetch, client-side search (name / phone / loan number), pull-to-refresh,
 *    the /api/employee/loan/pay payment sheet, the /api/employee/loan/apply/
 *    planalty penalty sheet (endpoint name kept as-is from the API), the
 *    post-action SMS confirmation Alerts, and the profile image viewer
 *  - every toast keeps its original argument count and message
 *  - status colours mapped to semantic tokens: Paid → success,
 *    Pending → warning, anything else → neutral
 *  - design: avatar + detail-row collection cards with Pay/Penalty action
 *    buttons, a design search field with a clear slot, design modal
 *    sheets, skeletons on first load and a proper empty state
 */

const STATUS_CONFIG = {
  Paid: { bg: colors.successSoft, fg: colors.successInk },
  Pending: { bg: colors.warningSoft, fg: colors.warningInk },
};

const getStatusConfig = (status) =>
  STATUS_CONFIG[status] || { bg: colors.neutralSoft, fg: colors.neutralInk };

const StatusBadge = ({ status }) => {
  const config = getStatusConfig(status);
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.statusBadgeText, { color: config.fg }]} numberOfLines={1}>
        {status}
      </Text>
    </View>
  );
};

const DetailRow = ({ icon, children }) => (
  <View style={styles.detailRow}>
    <Icon name={icon} size={16} color={colors.inkMuted} />
    <Text style={styles.detailText} numberOfLines={1}>
      {children}
    </Text>
  </View>
);

const LoadingList = () => (
  <View style={styles.page}>
    {[0, 1, 2].map((i) => (
      <Card key={i} padded={false} style={{ marginBottom: spacing.md }}>
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Skeleton width={50} height={50} radius={radius.full} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Skeleton width="50%" height={16} />
              <Skeleton width="35%" height={12} />
            </View>
          </View>
          <Skeleton width="75%" height={12} />
          <Skeleton width="60%" height={12} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Skeleton width="48%" height={44} radius={radius.md} />
            <Skeleton width="48%" height={44} radius={radius.md} />
          </View>
        </View>
      </Card>
    ))}
  </View>
);

const TodaysCollectionScreen = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmPaymentLoading, setConfirmPaymentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({
    amount: '',
    paymentMethod: 'Cash',
    transactionId: '',
  });
  const [penaltyAmount, setPenaltyAmount] = useState('');

  const [currentImage, setCurrentImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // Filter collections based on search query
  const filteredCollections = collections.filter((item) => {
    const customerName = `${item.loan?.customer?.fname || ''} ${item.loan?.customer?.lname || ''}`.toLowerCase();
    const phoneNumber = item.loan?.customer?.phoneNumber?.toLowerCase() || '';
    const loanNumber = item.loan?.loanNumber?.toString().toLowerCase() || '';

    return (
      customerName.includes(searchQuery.toLowerCase()) ||
      phoneNumber.includes(searchQuery.toLowerCase()) ||
      loanNumber.includes(searchQuery.toLowerCase())
    );
  });

  const fetchTodaysCollections = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiCall('/api/employee/loan/collection/today', 'GET');
      if (response.status === 'success' && Array.isArray(response.data)) {
        setCollections(response.data);
      } else {
        showToast('error', 'Failed to fetch today\'s collections');
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      showToast('error', 'Failed to fetch today\'s collections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTodaysCollections();
  }, [fetchTodaysCollections]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTodaysCollections();
  };

  const handleImageOpen = (item) => {
    setCurrentImage(item.loan.customer.profilePic || ProfilePicturePlaceHolder);
    setImageModalVisible(true);
  };

  const handleDownloadProfilePicture = () => {
    console.log('DownloadIamge');
  };

  const handlePayment = async () => {
    try {
      setConfirmPaymentLoading(true);
      const response = await apiCall('/api/employee/loan/pay', 'POST', {
        loanId: selectedItem.loan._id,
        repaymentScheduleId: selectedItem._id,
        amount: parseFloat(paymentDetails.amount),
        paymentMethod: paymentDetails.paymentMethod,
        transactionId: paymentDetails.transactionId,
      });

      if (response.status === 'success') {
        showToast('success', 'Payment processed successfully');
        setShowPaymentModal(false);
        fetchTodaysCollections();
        Alert.alert('Send SMS', 'Do you want to send SMS to customer?', [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: () =>
              handleSendSMS(
                selectedItem.loan.customer.phoneNumber,
                `Your loan payment of Rs. ${paymentDetails.amount} is successfully processed.`
              ),
          },
        ]);
      } else {
        showToast('error', `Failed to process payment: ${response.message || 'Unknown error'}`);
        setShowPaymentModal(false);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      showToast('error', 'Failed to process payment');
    } finally {
      setConfirmPaymentLoading(false);
    }
  };

  const handleApplyPenalty = async () => {
    try {
      const response = await apiCall('/api/employee/loan/apply/planalty', 'POST', {
        loanId: selectedItem.loan._id,
        repaymentScheduleId: selectedItem._id,
        penaltyAmount: parseFloat(penaltyAmount),
      });

      if (response.status === 'success') {
        showToast('success', 'Penalty applied successfully');
        setShowPenaltyModal(false);
        fetchTodaysCollections();
        Alert.alert('Send SMS', 'Do you want to send SMS to customer?', [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: () =>
              handleSendSMS(
                selectedItem.loan.customer.phoneNumber,
                `A penalty of Rs. ${penaltyAmount} has been applied to your loan.`
              ),
          },
        ]);
      } else {
        showToast('error', 'Failed to apply penalty');
      }
    } catch (error) {
      console.error('Error applying penalty:', error);
      showToast('error', 'Failed to apply penalty');
    }
  };

  const renderItem = ({ item }) => (
    <Card elevation="subtle" style={{ marginBottom: spacing.md }}>
      <View style={styles.customerRow}>
        <TouchableOpacity
          onPress={() => handleImageOpen(item)}
          activeOpacity={0.75}
          accessibilityRole="button"
        >
          <Image
            source={
              item.loan?.customer?.profilePic ? { uri: item.loan.customer.profilePic } : ProfilePicturePlaceHolder
            }
            style={styles.avatar}
            resizeMode="cover"
          />
        </TouchableOpacity>
        <View style={styles.customerTextWrap}>
          <Text style={styles.customerName} numberOfLines={1}>
            {`${item.loan?.customer?.fname || 'Not'} ${item.loan?.customer?.lname || 'Available'}`}
          </Text>
          <Text style={styles.phoneNumber} numberOfLines={1}>
            {item.loan?.customer?.phoneNumber}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.detailsWrap}>
        <DetailRow icon="receipt">Loan Number: #{item.loan?.loanNumber}</DetailRow>
        <DetailRow icon="currency-inr">
          Loan: ₹{Number(item.loan?.loanAmount || 0).toLocaleString('en-IN')}
        </DetailRow>
        <DetailRow icon="calendar-clock">
          Due: ₹{Number(item.amount || 0).toLocaleString('en-IN')} on {new Date(item.dueDate).toLocaleDateString()}
        </DetailRow>
        <DetailRow icon="numeric">Installment: {item.loanInstallmentNumber}</DetailRow>
        <DetailRow icon="cash">
          Today: ₹{Number(item.amount || 0).toLocaleString('en-IN')}
        </DetailRow>
        <DetailRow icon="clock-alert-outline">
          Total Overdue: ₹{Number(item.loan?.totalOverdueAmount || 0).toLocaleString('en-IN')}
        </DetailRow>
        {item.penaltyApplied ? (
          <View style={styles.penaltyChip}>
            <Icon name="warning" size={14} color={colors.dangerInk} />
            <Text style={styles.penaltyText}>
              Penalty: ₹{Number(item.amount - item.originalAmount || 0).toLocaleString('en-IN')}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <Button
          label="Pay"
          icon="cash"
          variant="accent"
          flex
          onPress={() => {
            setSelectedItem(item);
            setPaymentDetails({ ...paymentDetails, amount: item.amount.toString() });
            setShowPaymentModal(true);
          }}
        />
        <Button
          label="Penalty"
          icon="currency-usd"
          variant="outline"
          flex
          onPress={() => {
            setSelectedItem(item);
            setShowPenaltyModal(true);
          }}
        />
      </View>
    </Card>
  );

  const renderPaymentModal = () => (
    <Modal visible={showPaymentModal} transparent animationType="slide" onRequestClose={() => setShowPaymentModal(false)}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Process Payment</Text>

          <TextField
            label="Amount"
            value={paymentDetails.amount}
            onChangeText={(text) => setPaymentDetails((prev) => ({ ...prev, amount: text }))}
            keyboardType="numeric"
            leftIcon="cash"
            placeholder="₹ Amount"
          />

          <View style={styles.pickerWrap}>
            <Text style={styles.fieldLabel}>Payment Method</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={paymentDetails.paymentMethod}
                onValueChange={(itemValue) => setPaymentDetails((prev) => ({ ...prev, paymentMethod: itemValue }))}
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
            label="Transaction ID (optional)"
            value={paymentDetails.transactionId}
            onChangeText={(text) => setPaymentDetails((prev) => ({ ...prev, transactionId: text }))}
            leftIcon="receipt"
            placeholder="Enter transaction ID"
          />

          <Button
            label="Confirm Payment"
            icon="check"
            variant="accent"
            full
            loading={confirmPaymentLoading}
            onPress={handlePayment}
            style={{ marginTop: spacing.sm }}
          />
          {!confirmPaymentLoading ? (
            <Button label="Cancel" variant="ghost" full onPress={() => setShowPaymentModal(false)} />
          ) : null}
        </View>
        <CustomToast />
      </View>
    </Modal>
  );

  const renderPenaltyModal = () => (
    <Modal visible={showPenaltyModal} transparent animationType="slide" onRequestClose={() => setShowPenaltyModal(false)}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Apply Penalty</Text>

          <TextField
            label="Penalty Amount"
            value={penaltyAmount}
            onChangeText={setPenaltyAmount}
            keyboardType="numeric"
            leftIcon="currency-inr"
            placeholder="₹ Amount"
          />

          <Button
            label="Confirm Penalty"
            icon="warning"
            variant="danger"
            full
            onPress={handleApplyPenalty}
            style={{ marginTop: spacing.sm }}
          />
          <Button label="Cancel" variant="ghost" full onPress={() => setShowPenaltyModal(false)} />
        </View>
        <CustomToast />
      </View>
    </Modal>
  );

  if (loading && collections.length === 0) {
    return (
      <View style={styles.container}>
        <LoadingList />
        <CustomToast />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name, phone, or loan number"
          leftIcon="search"
          rightSlot={
            searchQuery.length > 0 ? (
              <Button iconOnly icon="close-circle" size="sm" onPress={() => setSearchQuery('')} />
            ) : null
          }
        />
      </View>

      <FlatList
        data={filteredCollections}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.inkMuted} />
        }
        contentContainerStyle={styles.page}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="cash"
              title="No collections due today"
              subtitle="Collections due today will appear here."
              style={{ marginTop: spacing.xxxl }}
            />
          )
        }
      />

      {renderPaymentModal()}
      {renderPenaltyModal()}
      <ImageModal
        isVisible={imageModalVisible}
        imageUri={currentImage}
        onDownload={handleDownloadProfilePicture}
        onClose={() => setImageModalVisible(false)}
      />
      <CustomToast />
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
    paddingBottom: spacing.xxxl,
  },
  searchWrap: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  customerTextWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  customerName: {
    ...type.h2,
    color: colors.ink,
  },
  phoneNumber: {
    ...type.sub,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusBadgeText: {
    ...type.micro,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  detailsWrap: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs + 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    ...type.sub,
    color: colors.inkSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  penaltyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  penaltyText: {
    ...type.sub,
    fontWeight: '700',
    color: colors.dangerInk,
  },

  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '90%',
    gap: spacing.md,
  },
  modalTitle: {
    ...type.h2,
    color: colors.ink,
    textAlign: 'center',
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
});

export default TodaysCollectionScreen;
