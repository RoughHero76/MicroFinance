import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { CustomToast } from '../../../../components/toast/CustomToast';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useHomeContext } from '../../../../components/context/HomeContext';
import { colors, spacing, type, radii, shadow } from '../../../../theme/tokens';
import EviTextField from '../../../../components/ui/EviTextField';
import EviButton from '../../../../components/ui/EviButton';

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
    const employeeItems = employees.map(emp => ({
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
        console.log(paymentMethod);

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
                            {renderInput('Amount', amount, setAmount, 'numeric')}
                            {renderPicker('Payment Method', paymentMethod, setPaymentMethod, [
                                { label: 'Cash', value: 'Cash' },
                                { label: 'Bank Transfer', value: 'Bank Transfer' },
                                { label: 'GooglePay', value: 'GooglePay' },
                                { label: 'PhonePay', value: 'PhonePay' },
                                { label: 'Paytm', value: 'Paytm' },
                                { label: 'Cheque', value: 'Cheque' },
                                { label: 'Other', value: 'Other' },
                            ])}
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

                            {
                                renderPicker('Payment Method', paymentMethod, setPaymentMethod, [
                                    { label: 'Cash', value: 'Cash' },
                                    { label: 'Bank Transfer', value: 'Bank Transfer' },
                                    { label: 'GooglePay', value: 'GooglePay' },
                                    { label: 'PhonePay', value: 'PhonePay' },
                                    { label: 'Paytm', value: 'Paytm' },
                                    { label: 'Cheque', value: 'Cheque' },
                                    { label: 'Other', value: 'Other' },
                                ])

                            }
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
                            {renderInput('Amount', amount, setAmount, 'numeric')}
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
                            {renderInput('Amount', amount, setAmount, 'numeric')}
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
                            {renderInput('Amount', amount, setAmount, 'numeric')}
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
                            {renderInput('Amount', amount, setAmount, 'numeric')}
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
                            {renderInput('Amount', amount, setAmount, 'numeric')}
                            {renderPicker('Payment Method', paymentMethod, setPaymentMethod, [
                                { label: 'Cash', value: 'Cash' },
                                { label: 'Bank Transfer', value: 'Bank Transfer' },
                                { label: 'GooglePay', value: 'GooglePay' },
                                { label: 'PhonePay', value: 'PhonePay' },
                                { label: 'Paytm', value: 'Paytm' },
                                { label: 'Cheque', value: 'Cheque' },
                                { label: 'Other', value: 'Other' },
                            ])}
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
                            {renderInput('Amount', amount, setAmount, 'numeric')}
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
                            {renderPicker('Payment Method', paymentMethod, setPaymentMethod, [
                                { label: 'Cash', value: 'Cash' },
                                { label: 'Bank Transfer', value: 'Bank Transfer' },
                                { label: 'GooglePay', value: 'GooglePay' },
                                { label: 'PhonePay', value: 'PhonePay' },
                                { label: 'Paytm', value: 'Paytm' },
                                { label: 'Cheque', value: 'Cheque' },
                                { label: 'Other', value: 'Other' },
                            ])}
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
                            {renderInput('Amount', amount, setAmount, 'numeric')}
                            {renderPicker('Payment Method', paymentMethod, setPaymentMethod, [
                                { label: 'Cash', value: 'Cash' },
                                { label: 'Bank Transfer', value: 'Bank Transfer' },
                                { label: 'GooglePay', value: 'GooglePay' },
                                { label: 'PhonePay', value: 'PhonePay' },
                                { label: 'Paytm', value: 'Paytm' },
                                { label: 'Cheque', value: 'Cheque' },
                                { label: 'Other', value: 'Other' },
                            ])}
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
            {renderInput('Penalty Amount (Optional)', penaltyAmount, setPenaltyAmount, 'numeric')}
            {renderInput('Penalty Reason (Optional)', penaltyReason, setPenaltyReason)}
            {renderDatePicker('Penalty Applied Date (Optional)', penaltyAppliedDate, setPenaltyAppliedDate, showPenaltyDatePicker, setShowPenaltyDatePicker)}
        </>
    );

    const renderInput = (label, value, onChangeText, keyboardType = 'default') => (
        <EviTextField
            label={label}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            placeholder={`Enter ${label.toLowerCase()}`}
            mode="flat"
            style={styles.field}
        />
    );

    const renderPicker = (label, selectedValue, onValueChange, items) => (
        <View style={styles.field}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.pickerWrap}>
                <Picker
                    selectedValue={selectedValue}
                    onValueChange={onValueChange}
                    style={styles.picker}
                >
                    <Picker.Item label="Select an option" value="" />
                    {items.map((item) => (
                        <Picker.Item key={item.value} label={item.label} value={item.value} />
                    ))}
                </Picker>
            </View>
        </View>
    );

    const renderEmployeePicker = (label, selectedValue, onValueChange, items) => (
        <View style={styles.field}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.pickerWrap}>
                <Picker
                    selectedValue={selectedValue}
                    onValueChange={onValueChange}
                    style={styles.picker}
                >
                    <Picker.Item label="Select an option" value="" />
                    {items.map((item) => (
                        <Picker.Item key={item.value} label={item.label} value={item.value} />
                    ))}
                </Picker>
            </View>
        </View>
    );


    const renderDatePicker = (label, date, onDateChange, showPicker, setShowPicker) => (
        <View style={styles.field}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.dateButton} activeOpacity={0.7}>
                <Text style={styles.dateButtonText}>{date.toLocaleDateString()}</Text>
                <Icon name="calendar-month" size={20} color={colors.inkFaint} style={styles.dateIcon} />
            </TouchableOpacity>
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

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <ScrollView contentContainerStyle={styles.scrollViewContent}>
                        <Text style={styles.modalTitle}>Edit Repayment Schedule</Text>

                        <View style={styles.statusContainer}>
                            <Text style={styles.statusText}>Old Status: <Text style={styles.statusValue}>{scheduleItem?.status}</Text></Text>
                            <Text style={styles.statusText}>New Status: {newStatus ? newStatus : 'N/A'}</Text>
                        </View>

                        {renderPicker('Status', newStatus, setNewStatus, [
                            { label: 'Pending', value: 'Pending' },
                            { label: 'Paid', value: 'Paid' },
                            { label: 'Partially Paid', value: 'PartiallyPaid' },
                            { label: 'Overdue', value: 'Overdue' },
                            { label: 'Advance Paid', value: 'AdvancePaid' },
                            { label: 'Overdue Paid', value: 'OverduePaid' },
                            { label: 'Waived', value: 'Waived' },
                        ])}

                        {renderConditionalFields()}

                        {renderInput('Transaction ID', transactionId, setTransactionId)}

                        <EviButton
                            title="Save Changes"
                            onPress={handleSave}
                            icon="check"
                            variant="primary"
                            size="lg"
                            style={styles.saveButton}
                        />
                    </ScrollView>

                    <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                        <Icon name="close" size={20} color={colors.inkSoft} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
            <CustomToast />
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(10, 31, 22, 0.55)',
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: radii.xl,
        width: '92%',
        maxHeight: '85%',
        overflow: 'hidden',
        ...shadow.card,
    },
    scrollViewContent: {
        padding: spacing.xl,
    },
    modalTitle: {
        fontSize: type.sizes.xxl,
        fontWeight: type.weights.bold,
        marginBottom: spacing.lg,
        color: colors.ink,
        textAlign: 'center',
    },
    statusContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radii.md,
        gap: spacing.md,
    },
    statusText: {
        fontSize: type.sizes.sm,
        fontWeight: type.weights.medium,
        color: colors.inkSoft,
        flexShrink: 1,
    },
    statusValue: {
        color: colors.brand,
        fontWeight: type.weights.bold,
    },
    field: {
        marginBottom: spacing.lg,
    },
    inputLabel: {
        fontSize: type.sizes.sm,
        marginBottom: spacing.xs,
        color: colors.inkSoft,
        fontWeight: type.weights.medium,
    },
    pickerWrap: {
        backgroundColor: colors.card,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.line,
        overflow: 'hidden',
    },
    picker: {
        height: 52,
        color: colors.ink,
    },
    dateButton: {
        height: 52,
        backgroundColor: colors.card,
        borderColor: colors.line,
        borderWidth: 1,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateButtonText: {
        fontSize: type.sizes.md,
        color: colors.ink,
    },
    dateIcon: {
        marginLeft: spacing.md,
    },
    saveButton: {
        marginTop: spacing.lg,
    },
    closeButton: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radii.pill,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default EditRepaymentScheduleModal;
