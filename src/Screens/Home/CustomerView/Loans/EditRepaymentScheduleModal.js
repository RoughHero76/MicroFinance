import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, SafeAreaView } from 'react-native';
import { CustomToast } from '../../../../components/toast/CustomToast';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useHomeContext } from '../../../../components/context/HomeContext';
import { getAmountPaidSoFar, getAllocationForSchedule } from '../../../../components/utils/repaymentScheduleHelpers';

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

    // Read-only context before editing anything: the original EMI never
    // changes, but scheduleItem.amount itself means different things
    // depending on status (0 paid, cumulative paid, or fully settled) — so
    // show the actual paid-so-far figure explicitly instead of that raw field.
    const renderScheduleSummary = (item) => {
        const originalAmount = item.originalAmount || item.amount;
        const amountPaid = getAmountPaidSoFar(item);

        return (
            <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Original EMI</Text>
                    <Text style={styles.summaryValue}>Rs.{originalAmount}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Paid So Far</Text>
                    <Text style={styles.summaryValue}>Rs.{amountPaid}</Text>
                </View>
                {item.repayments && item.repayments.length > 0 && (
                    <View style={styles.summaryRepayments}>
                        <Text style={styles.summaryLabel}>Repayments</Text>
                        {item.repayments.map((repayment, index) => {
                            const allocation = getAllocationForSchedule(repayment, item._id);
                            const isSplitPayment = repayment.scheduleAllocations && repayment.scheduleAllocations.length > 1;
                            return (
                                <Text key={index} style={styles.summaryRepaymentText}>
                                    Rs.{allocation} on {new Date(repayment.paymentDate).toLocaleDateString()}
                                    {isSplitPayment ? ` (part of Rs.${repayment.amount} total payment)` : ''}
                                </Text>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };

    const renderPenaltyFields = () => (
        <>
            {renderInput('Penalty Amount (Optional)', penaltyAmount, setPenaltyAmount, 'numeric')}
            {renderInput('Penalty Reason (Optional)', penaltyReason, setPenaltyReason)}
            {renderDatePicker('Penalty Applied Date (Optional)', penaltyAppliedDate, setPenaltyAppliedDate, showPenaltyDatePicker, setShowPenaltyDatePicker)}
        </>
    );

    const renderInput = (label, value, onChangeText, keyboardType = 'default') => (
        <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                placeholder={`Enter ${label.toLowerCase()}`}
                placeholderTextColor="#999"
            />
        </View>
    );

    const renderPicker = (label, selectedValue, onValueChange, items) => (
        <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.pickerContainer}>
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
        <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.pickerContainer}>
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
        <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.datePickerButton}>
                <Text style={styles.datePickerButtonText}>{date.toLocaleDateString()}</Text>
                <Icon name="calendar" size={24} color="#6200EE" />
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

                        {scheduleItem && renderScheduleSummary(scheduleItem)}

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

                        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Icon name="close" size={24} color="#6200EE" />
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        width: '90%',
        maxHeight: '80%',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    scrollViewContent: {
        padding: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#6200EE',
        textAlign: 'center',
    },
    statusContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    statusValue: {
        color: '#6200EE',
    },
    summaryContainer: {
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        padding: 12,
        marginBottom: 15,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    summaryValue: {
        fontSize: 14,
        color: '#333',
    },
    summaryRepayments: {
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        paddingTop: 8,
    },
    summaryRepaymentText: {
        fontSize: 13,
        color: '#555',
        marginTop: 2,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        marginBottom: 5,
        color: '#333',
        fontWeight: '600',
    },
    input: {
        height: 50,
        borderColor: '#6200EE',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        color: '#333',
        fontSize: 16,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#6200EE',
        borderRadius: 10,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        color: '#333',
    },
    datePickerButton: {
        height: 50,
        borderColor: '#6200EE',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    datePickerButtonText: {
        fontSize: 16,
        color: '#333',
    },
    saveButton: {
        backgroundColor: '#6200EE',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 18,
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        padding: 5,
    },
});

export default EditRepaymentScheduleModal;