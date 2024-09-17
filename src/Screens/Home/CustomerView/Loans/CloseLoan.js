import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Button, TextInput, Checkbox, Modal, Portal } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from "../../../../components/api/apiUtils";
import { showToast, CustomToast } from "../../../../components/toast/CustomToast";

const CloseLoan = ({ route, navigation }) => {
    const [loan, setLoan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const { control, handleSubmit, formState: { errors }, watch } = useForm();
    const { loanId } = route.params;

    const amountPaying = watch('totalAmountPaying', '0');

    useEffect(() => {
        fetchLoanDetails();
    }, []);

    const fetchLoanDetails = async () => {
        try {
            setLoading(true);
            const response = await apiCall(`/api/admin/loan?loanId=${loanId}`);
            setLoan(response.data[0]);
        } catch (error) {
            showToast('error', 'Failed to fetch loan details');
        } finally {
            setLoading(false);
        }
    };

    const showConfirmationModal = (data) => {
        setModalVisible(true);
    };

    const hideConfirmationModal = () => {
        setModalVisible(false);
    };

    const onSubmit = async (data) => {
        try {
            setSubmitting(true);
            await apiCall('/api/admin/loan/close', 'POST', {
                loanId,
                allPenaltiesPaid: data.allPenaltiesPaid,
                totalRemainingAmountCustomerIsPaying: parseFloat(data.totalAmountPaying),
                deleteLoanDocuments: data.deleteLoanDocuments
            });
            showToast('success', 'Loan closed successfully');
            navigation.goBack();
        } catch (error) {
            showToast('error', error.message || 'Failed to close loan');
        } finally {
            setSubmitting(false);
            hideConfirmationModal();
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <CustomToast />

            <View style={styles.infoContainer}>
                <Icon name="information-outline" size={24} color="#4a90e2" />
                <Text style={styles.infoText}>Loan Details</Text>
            </View>

            <View style={styles.detailsContainer}>
                <Text style={styles.detailText}>Loan Amount: ₹{loan.loanAmount}</Text>
                <Text style={styles.detailText}>Outstanding Amount: ₹{loan.outstandingAmount}</Text>
                <Text style={styles.detailText}>Total Paid: ₹{loan.totalPaid}</Text>
                <Text style={styles.detailText}>Total Penalty: ₹{loan.totalPenaltyAmmount}</Text>
            </View>

            <Controller
                control={control}
                rules={{ required: true, min: 0, max: loan.outstandingAmount }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                        style={styles.input}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        label="Amount Paying"
                        keyboardType="numeric"
                        error={!!errors.totalAmountPaying}
                    />
                )}
                name="totalAmountPaying"
                defaultValue=""
            />
            {errors.totalAmountPaying && <Text style={styles.errorText}>Amount must be between 0 and {loan.outstandingAmount}</Text>}

            <Controller
                control={control}
                render={({ field: { onChange, value } }) => (
                    <Checkbox.Item
                        label="All Penalties Paid"
                        status={value ? 'checked' : 'unchecked'}
                        onPress={() => onChange(!value)}
                    />
                )}
                name="allPenaltiesPaid"
                defaultValue={false}
            />

            <Controller
                control={control}
                render={({ field: { onChange, value } }) => (
                    <Checkbox.Item
                        label="Delete Loan Documents"
                        status={value ? 'checked' : 'unchecked'}
                        onPress={() => onChange(!value)}
                    />
                )}
                name="deleteLoanDocuments"
                defaultValue={false}
            />

            <Button
                mode="contained"
                onPress={handleSubmit(showConfirmationModal)}
                disabled={submitting}
                style={styles.button}
            >
                Close Loan
            </Button>

            <Portal>
                <Modal visible={modalVisible} onDismiss={hideConfirmationModal} contentContainerStyle={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Confirm Loan Closure</Text>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalText}>Are you sure you want to close this loan?</Text>
                        <Text style={styles.modalText}>Amount Customer is Paying: ₹{amountPaying}</Text>
                        <Text style={styles.modalText}>Outstanding Amount: ₹{loan.outstandingAmount}</Text>
                        <Text style={styles.modalText}>Remaining Balance: ₹{Math.max(0, loan.outstandingAmount - parseFloat(amountPaying || 0)).toFixed(2)}</Text>
                    </View>
                    <View style={styles.modalButtons}>
                        <Button onPress={hideConfirmationModal} style={styles.modalButton} disabled={submitting}>Cancel</Button>
                        <Button onPress={handleSubmit(onSubmit)} mode="contained" style={styles.modalButton} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#ffffff" /> : 'Confirm'}
                        </Button>
                    </View>
                </Modal>
            </Portal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoText: {
        marginLeft: 8,
        fontSize: 18,
        fontWeight: '600',
        color: '#4a90e2',
    },
    detailsContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
    },
    detailText: {
        fontSize: 16,
        marginBottom: 8,
        color: '#555',
    },
    input: {
        marginBottom: 16,
        backgroundColor: '#ffffff',
    },
    errorText: {
        color: 'red',
        marginBottom: 8,
    },
    button: {
        marginTop: 16,
        paddingVertical: 8,
        backgroundColor: '#e24c2c',
    },
    modalContainer: {
        backgroundColor: 'white',
        padding: 20,
        margin: 20,
        borderRadius: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
        color: '#4a90e2',
    },
    modalContent: {
        marginBottom: 20,
    },
    modalText: {
        fontSize: 16,
        marginBottom: 8,
        color: '#555',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    modalButton: {
        minWidth: 100,
    },
});

export default CloseLoan;