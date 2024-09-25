import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

const EditRepaymentScheduleModal = ({ visible, onClose, onSave, scheduleItem }) => {
    const [newStatus, setNewStatus] = useState(scheduleItem?.status || '');
    const [amount, setAmount] = useState(scheduleItem?.amount?.toString() || '');
    const [paymentDate, setPaymentDate] = useState(new Date());
    const [paymentMethod, setPaymentMethod] = useState('');
    const [penaltyAmount, setPenaltyAmount] = useState('');
    const [penaltyReason, setPenaltyReason] = useState('');
    const [penaltyAppliedDate, setPenaltyAppliedDate] = useState(new Date());
    const [transactionId, setTransactionId] = useState('');

    const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);
    const [showPenaltyDatePicker, setShowPenaltyDatePicker] = useState(false);
    console.log('EditRepaymentScheduleModal', scheduleItem);

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
        });
        onClose();
    };

    const renderConditionalFields = () => {
        const oldStatus = scheduleItem?.status;

        switch (oldStatus) {
            case 'Pending':
                if (['PartiallyPaid', 'OverduePaid'].includes(newStatus)) {
                    return (
                        <>
                            {renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker)}
                            {renderInput('Amount', amount, setAmount, 'numeric')}
                            {renderPicker('Payment Method', paymentMethod, setPaymentMethod, [
                                { label: 'Cash', value: 'Cash' },
                                { label: 'Bank Transfer', value: 'BankTransfer' },
                                { label: 'GooglePay', value: 'GooglePay' },
                                { label: 'PhonePay', value: 'PhonePay' },
                                { label: 'Paytm', value: 'Paytm' },
                                { label: 'Cheque', value: 'Cheque' },
                                { label: 'Other', value: 'Other' },
                            ])}
                        </>
                    );
                } else if (newStatus === 'Overdue') {
                    return renderPenaltyFields();
                } else if (newStatus === 'Paid' || newStatus === 'AdvancePaid') {
                    { renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker) }

                    {
                        renderPicker('Payment Method', paymentMethod, setPaymentMethod, [
                            { label: 'Cash', value: 'Cash' },
                            { label: 'Bank Transfer', value: 'BankTransfer' },
                            { label: 'GooglePay', value: 'GooglePay' },
                            { label: 'PhonePay', value: 'PhonePay' },
                            { label: 'Paytm', value: 'Paytm' },
                            { label: 'Cheque', value: 'Cheque' },
                            { label: 'Other', value: 'Other' },
                        ])
                    }
                }
                break;
            case 'Paid':
                if (newStatus === 'PartiallyPaid') {
                    return (
                        <>
                            {renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker)}
                            {renderInput('Amount', amount, setAmount, 'numeric')}
                            {renderPenaltyFields()}
                        </>
                    );
                } else if (newStatus === 'AdvancePaid') {
                    return renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker);
                }
                break;
            case 'PartiallyPaid':
                if (newStatus === 'Paid') {
                    return (
                        <>
                            {renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker)}
                            {renderInput('Amount', amount, setAmount, 'numeric')}
                        </>
                    );
                } else if (['Overdue', 'OverduePaid'].includes(newStatus)) {
                    return (
                        <>
                            {renderInput('Amount', amount, setAmount, 'numeric')}
                            {renderPenaltyFields()}
                        </>
                    );
                } else if (newStatus === 'AdvancePaid') {
                    return (
                        <>
                            {renderDatePicker('Payment Date', paymentDate, setPaymentDate, showPaymentDatePicker, setShowPaymentDatePicker)}
                            {renderInput('Amount', amount, setAmount, 'numeric')}
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
                                { label: 'Bank Transfer', value: 'BankTransfer' },
                                { label: 'GooglePay', value: 'GooglePay' },
                                { label: 'PhonePay', value: 'PhonePay' },
                                { label: 'Paytm', value: 'Paytm' },
                                { label: 'Cheque', value: 'Cheque' },
                                { label: 'Other', value: 'Other' },
                            ])}
                        </>
                    );
                }
                break;
            default:
                return null;
        }
    };

    const renderPenaltyFields = () => (
        <>
            {renderInput('Penalty Amount', penaltyAmount, setPenaltyAmount, 'numeric')}
            {renderInput('Penalty Reason', penaltyReason, setPenaltyReason)}
            {renderDatePicker('Penalty Applied Date', penaltyAppliedDate, setPenaltyAppliedDate, showPenaltyDatePicker, setShowPenaltyDatePicker)}
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