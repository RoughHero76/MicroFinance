import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { CustomToast } from '../../../../components/toast/CustomToast';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useHomeContext } from '../../../../components/context/HomeContext';
import Icon from '../../../../design/Icon';
import Button from '../../../../design/components/Button';
import TextField from '../../../../design/components/TextField';
import { colors, spacing, radius, type } from '../../../../design/tokens';

/**
 * EditRepaymentScheduleModal — status-transition editor for a repayment
 * schedule entry, rebuilt on the "Ink & Amber" design system.
 *  - identical behaviour: the same oldStatus → newStatus conditional field
 *    matrix, the same employee (collectedBy) picker fed from HomeContext,
 *    the same native date pickers, and the exact handleSave payload
 *    ({ id, status, amount, paymentDate, paymentMethod, penaltyAmount,
 *      penaltyReason, penaltyAppliedDate, transactionId, collectedBy })
 *    followed by onSave(...) → onClose()
 *  - presentation only changed: bottom-sheet layout, design TextField /
 *    Picker / Button components, verified icon names, ink + amber palette
 */

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Paid', value: 'Paid' },
  { label: 'Partially Paid', value: 'PartiallyPaid' },
  { label: 'Overdue', value: 'Overdue' },
  { label: 'Advance Paid', value: 'AdvancePaid' },
  { label: 'Overdue Paid', value: 'OverduePaid' },
  { label: 'Waived', value: 'Waived' },
];

const PAYMENT_METHODS = [
  { label: 'Cash', value: 'Cash' },
  { label: 'Bank Transfer', value: 'Bank Transfer' },
  { label: 'GooglePay', value: 'GooglePay' },
  { label: 'PhonePay', value: 'PhonePay' },
  { label: 'Paytm', value: 'Paytm' },
  { label: 'Cheque', value: 'Cheque' },
  { label: 'Other', value: 'Other' },
];

const LabeledPicker = ({ label, icon, options, value, onValueChange, placeholder = 'Select an option' }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.pickerWrap}>
      <Icon name={icon} size={18} color={colors.inkMuted} />
      <Picker
        selectedValue={value}
        onValueChange={onValueChange}
        style={[styles.picker, !value && { color: colors.inkMuted }]}
      >
        <Picker.Item label={placeholder} value="" />
        {options.map((option) => (
          <Picker.Item key={option.value} label={option.label} value={option.value} />
        ))}
      </Picker>
      <Icon name="chevron-down" size={16} color={colors.inkMuted} />
    </View>
  </View>
);

const DateField = ({ label, date, onDateChange, showPicker, setShowPicker }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Pressable
      onPress={() => setShowPicker(true)}
      style={({ pressed }) => [styles.dateButton, pressed && { opacity: 0.9 }]}
    >
      <Icon name="calendar" size={18} color={colors.inkMuted} />
      <Text style={[type.body, { color: colors.ink, marginLeft: 8 }]}>{date.toLocaleDateString()}</Text>
      <Icon name="chevron-down" size={14} color={colors.inkMuted} style={{ marginLeft: 'auto' }} />
    </Pressable>
    {showPicker && (
      <DateTimePicker
        value={date}
        mode="date"
        display="default"
        onChange={(event, selectedDate) => {
          setShowPicker(false);
          if (selectedDate) onDateChange(selectedDate);
        }}
      />
    )}
  </View>
);

const StatusChip = ({ title, value, accent }) => (
  <View style={[styles.statusChip, accent && styles.statusChipAccent]}>
    <Text style={styles.statusChipTitle}>{title}</Text>
    <Text style={[type.bodyBold, { color: accent ? colors.accentInk : colors.ink }]}>
      {value || 'N/A'}
    </Text>
  </View>
);

const EditRepaymentScheduleModal = ({ visible, onClose, onSave, scheduleItem }) => {
  const [newStatus, setNewStatus] = useState(scheduleItem?.status || '');
  const [amount, setAmount] = useState(scheduleItem?.amount?.toString() || '');
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [paymentMethod, setPaymentMethod] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [penaltyReason, setPenaltyReason] = useState('');
  const [penaltyAppliedDate, setPenaltyAppliedDate] = useState(new Date());
  const [transactionId, setTransactionId] = useState('');

  const { employees } = useHomeContext();

  const [collectedBy, setCollectedBy] = useState('');
  const employeeItems = (employees || []).map(emp => ({
    label: `${emp.fname} ${emp.lname}`,
    value: emp._id
  }));

  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);
  const [showPenaltyDatePicker, setShowPenaltyDatePicker] = useState(false);

  useEffect(() => {
    if (scheduleItem) {
      setNewStatus(scheduleItem.status);
      setAmount(scheduleItem.amount?.toString() || '');
      setPaymentDate(scheduleItem.paymentDate ? new Date(scheduleItem.paymentDate) : new Date());
      setPaymentMethod(scheduleItem.paymentMethod || '');
      setPenaltyAmount(scheduleItem.penaltyAmount?.toString() || '');
      setPenaltyReason(scheduleItem.penaltyReason || '');
      setPenaltyAppliedDate(scheduleItem.penaltyAppliedDate ? new Date(scheduleItem.penaltyAppliedDate) : new Date());
      setTransactionId(scheduleItem.transactionId || '');
    }
  }, [scheduleItem]);

  const handleSave = () => {
    onSave({
      id: scheduleItem._id,
      status: newStatus,
      amount: parseFloat(amount),
      paymentDate: paymentDate.toISOString(),
      paymentMethod,
      penaltyAmount: penaltyAmount ? parseFloat(penaltyAmount) : undefined,
      penaltyReason,
      penaltyAppliedDate: penaltyAppliedDate.toISOString(),
      transactionId,
      collectedBy
    });
    onClose();
  };

  const renderConditionalFields = () => {
    const oldStatus = scheduleItem?.status;

    switch (oldStatus) {
      case 'Pending':

        if (newStatus === 'Paid') {
          return (
            <>
              {renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker)}
              {renderEmployeePicker(
                'Collected By',
                collectedBy,
                (value) => setCollectedBy(value),
                employeeItems
              )}
            </>
          )
        }
        else if (['PartiallyPaid', 'OverduePaid'].includes(newStatus)) {
          return (
            <>
              {renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker)}
              {renderInput('Amount', amount, setAmount, { icon: 'currency-inr', keyboardType: 'numeric' })}
              {renderPicker('Payment Method', paymentMethod, setPaymentMethod, PAYMENT_METHODS)}
              {renderEmployeePicker(
                'Collected By',
                collectedBy,
                (value) => setCollectedBy(value),
                employeeItems
              )}
            </>
          );
        } else if (newStatus === 'Overdue') {
          return renderPenaltyFields();
        } else if (newStatus === 'AdvancePaid') {
          return (
            <>
              {renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker)}
              {renderPicker('Payment Method', paymentMethod, setPaymentMethod, PAYMENT_METHODS)}
              {renderEmployeePicker(
                'Collected By',
                collectedBy,
                (value) => setCollectedBy(value),
                employeeItems
              )}
            </>
          )
        }
        break;
      case 'Paid':
        if (newStatus === 'PartiallyPaid') {
          return (
            <>
              {renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker)}
              {renderInput('Amount', amount, setAmount, { icon: 'currency-inr', keyboardType: 'numeric' })}
              {renderPenaltyFields()}
              {renderEmployeePicker(
                'Collected By',
                collectedBy,
                (value) => setCollectedBy(value),
                employeeItems
              )}
            </>
          );
        } else if (newStatus === 'AdvancePaid') {
          return (
            <>
              {renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker)}
              {renderEmployeePicker(
                'Collected By',
                collectedBy,
                (value) => setCollectedBy(value),
                employeeItems
              )}
            </>
          )
        }
        break;
      case 'PartiallyPaid':
        if (newStatus === 'Paid') {
          return (
            <>
              {renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker)}
              {renderInput('Amount', amount, setAmount, { icon: 'currency-inr', keyboardType: 'numeric' })}
              {renderEmployeePicker(
                'Collected By',
                collectedBy,
                (value) => setCollectedBy(value),
                employeeItems
              )}
            </>
          );
        } else if (['Overdue', 'OverduePaid'].includes(newStatus)) {
          return (
            <>
              {renderInput('Amount', amount, setAmount, { icon: 'currency-inr', keyboardType: 'numeric' })}
              {renderPenaltyFields()}
              {renderEmployeePicker(
                'Collected By',
                collectedBy,
                (value) => setCollectedBy(value),
                employeeItems
              )}
            </>
          );
        } else if (newStatus === 'AdvancePaid') {
          return (
            <>
              {renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker)}
              {renderInput('Amount', amount, setAmount, { icon: 'currency-inr', keyboardType: 'numeric' })}
              {renderEmployeePicker(
                'Collected By',
                collectedBy,
                (value) => setCollectedBy(value),
                employeeItems
              )}
            </>
          );
        }
        break;
      case 'Overdue':
        if (['Paid', 'PartiallyPaid', 'AdvancePaid', 'OverduePaid'].includes(newStatus)) {
          return (
            <>
              {renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker)}
              {renderInput('Amount', amount, setAmount, { icon: 'currency-inr', keyboardType: 'numeric' })}
              {renderPicker('Payment Method', paymentMethod, setPaymentMethod, PAYMENT_METHODS)}
              {renderEmployeePicker(
                'Collected By',
                collectedBy,
                (value) => setCollectedBy(value),
                employeeItems
              )}
            </>
          );
        }
        break;

      case 'OverduePaid':
        if (newStatus === 'PartiallyPaid') {
          return (
            <>
              {renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker)}
              {renderInput('Amount', amount, setAmount, { icon: 'currency-inr', keyboardType: 'numeric' })}
              {renderEmployeePicker(
                'Collected By',
                collectedBy,
                (value) => setCollectedBy(value),
                employeeItems
              )}
            </>
          )
        }

      case 'AdvancePaid':
        if (newStatus === 'Paid') {
          return (
            <>
              {renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker)}
              {renderPicker('Payment Method', paymentMethod, setPaymentMethod, PAYMENT_METHODS)}
              {renderEmployeePicker(
                'Collected By',
                collectedBy,
                (value) => setCollectedBy(value),
                employeeItems
              )}
            </>
          )
        } else if (newStatus === 'PartiallyPaid') {
          return (
            <>
              {renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker)}
              {renderInput('Amount', amount, setAmount, { icon: 'currency-inr', keyboardType: 'numeric' })}
              {renderPicker('Payment Method', paymentMethod, setPaymentMethod, PAYMENT_METHODS)}
              {renderEmployeePicker(
                'Collected By',
                collectedBy,
                (value) => setCollectedBy(value),
                employeeItems
              )}
            </>
          )
        }
      default:
        return null;
    }
  };

  const renderPenaltyFields = () => (
    <>
      {renderInput('Penalty Amount (Optional)', penaltyAmount, setPenaltyAmount, { icon: 'currency-inr', keyboardType: 'numeric' })}
      {renderInput('Penalty Reason (Optional)', penaltyReason, setPenaltyReason, { icon: 'notebook' })}
      {renderDatePicker('Penalty Applied Date (Optional)', penaltyAppliedDate, setPenaltyAppliedDate, showPenaltyDatePicker, setShowPenaltyDatePicker)}
    </>
  );

  const renderInput = (label, value, onChangeText, opts = {}) => (
    <TextField
      label={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={`Enter ${label.toLowerCase()}`}
      keyboardType={opts.keyboardType || 'default'}
      leftIcon={opts.icon || 'file'}
      style={{ marginBottom: spacing.md }}
    />
  );

  const renderPicker = (label, selectedValue, onValueChange, items) => (
    <LabeledPicker
      label={label}
      icon="cash"
      options={items}
      value={selectedValue}
      onValueChange={onValueChange}
    />
  );

  const renderEmployeePicker = (label, selectedValue, onValueChange, items) => (
    <LabeledPicker
      label={label}
      icon="user"
      options={items}
      value={selectedValue}
      onValueChange={onValueChange}
      placeholder="Select employee"
    />
  );

  const renderDatePicker = (label, date, onDateChange, showPicker, setShowPicker) => (
    <DateField
      label={label}
      date={date}
      onDateChange={onDateChange}
      showPicker={showPicker}
      setShowPicker={setShowPicker}
    />
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[type.h2, { color: colors.ink }]}>Edit Repayment Schedule</Text>
              <Text style={[type.sub, { color: colors.inkMuted, marginTop: 2 }]}>
                Adjust the status and payment details
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.8 }]}
            >
              <Icon name="close" size={18} color={colors.inkSecondary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.sheetBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.statusRow}>
              <View style={{ flex: 1 }}>
                <StatusChip title="Old status" value={scheduleItem?.status} />
              </View>
              <Icon name="arrow-right" size={16} color={colors.inkMuted} style={{ alignSelf: 'center', marginHorizontal: spacing.xs }} />
              <View style={{ flex: 1 }}>
                <StatusChip title="New status" value={newStatus} accent />
              </View>
            </View>

            <LabeledPicker
              label="Status"
              icon="clipboard"
              options={STATUS_OPTIONS}
              value={newStatus}
              onValueChange={setNewStatus}
              placeholder="Select status"
            />

            {renderConditionalFields()}

            <TextField
              label="Transaction ID"
              value={transactionId}
              onChangeText={setTransactionId}
              placeholder="Enter transaction id"
              leftIcon="receipt"
              style={{ marginBottom: spacing.lg }}
            />

            <Button
              label="Save Changes"
              icon="check"
              variant="accent"
              size="lg"
              full
              onPress={handleSave}
            />
          </ScrollView>
        </SafeAreaView>
      </View>
      <CustomToast />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    paddingBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  grabber: {
    width: 44,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.inkFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sheetBody: {
    padding: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusChip: {
    backgroundColor: colors.neutralSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  statusChipTitle: {
    ...type.micro,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...type.caption,
    color: colors.inkSecondary,
    marginBottom: 6,
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
    height: 52,
    color: colors.ink,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md - 4,
  },
});

export default EditRepaymentScheduleModal;
