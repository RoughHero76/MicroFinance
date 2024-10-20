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
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <CustomToast />

            <View style={styles.card}>
                <View style={styles.infoContainer}>
                    <Icon name="information-outline" size={24} color="#3498db" />
                    <Text style={styles.infoText}>Loan Details</Text>
                </View>

                <View style={styles.detailsContainer}>
                    <Text style={styles.detailText}>Loan Amount: ₹{loan.loanAmount}</Text>
                    <Text style={styles.detailText}>Outstanding Amount: ₹{loan.outstandingAmount}</Text>
                    <Text style={styles.detailText}>Total Paid: ₹{loan.totalPaid}</Text>
                    <Text style={styles.detailText}>Total Penalty: ₹{loan.totalPenaltyAmount}</Text>
                    <Text style={styles.detailText}>Total Outstanding Amount: {loan.outstandingAmount + loan.totalPenaltyAmount}</Text>
                </View>
            </View>

            <View style={styles.card}>
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
                            theme={{ colors: { primary: '#3498db' } }}
                        />
                    )}
                    name="totalAmountPaying"
                    defaultValue=""
                />
                {errors.totalAmountPaying && <Text style={styles.errorText}>Amount must be between 0 and {loan.outstandingAmount + loan.totalPenaltyAmount}</Text>}

                <Controller
                    control={control}
                    render={({ field: { onChange, value } }) => (
                        <Checkbox.Item
                            label="All Penalties Paid"
                            labelStyle={{ color: 'black' }}
                            status={value ? 'checked' : 'unchecked'}
                            onPress={() => onChange(!value)}
                            color="#3498db"
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
                            labelStyle={{ color: 'black' }}
                            status={value ? 'checked' : 'unchecked'}
                            onPress={() => onChange(!value)}
                            color="#3498db"
                        />
                    )}
                    name="deleteLoanDocuments"
                    defaultValue={false}
                />
            </View>

            <Button
                mode="contained"
                onPress={handleSubmit(showConfirmationModal)}
                disabled={submitting}
                style={styles.button}
                labelStyle={styles.buttonLabel}
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
                        <Button onPress={hideConfirmationModal} style={styles.modalButton} disabled={submitting} color="#95a5a6">Cancel</Button>
                        <Button onPress={handleSubmit(onSubmit)} mode="contained" style={styles.modalButton} disabled={submitting} color="#3498db">
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
        backgroundColor: '#ecf0f1',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoText: {
        marginLeft: 8,
        fontSize: 18,
        fontWeight: '600',
        color: '#3498db',
    },
    detailsContainer: {
        marginBottom: 8,
    },
    detailText: {
        fontSize: 16,
        marginBottom: 8,
        color: '#34495e',
    },
    input: {
        marginBottom: 16,
        backgroundColor: '#ffffff',
        color: 'black',
    },
    errorText: {
        color: '#e74c3c',
        marginBottom: 8,
    },
    button: {
        marginTop: 16,
        paddingVertical: 8,
        backgroundColor: '#3498db',
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalContainer: {
        backgroundColor: 'white',
        padding: 20,
        margin: 20,
        borderRadius: 8,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
        color: '#3498db',
    },
    modalContent: {
        marginBottom: 20,
    },
    modalText: {
        fontSize: 16,
        marginBottom: 8,
        color: '#34495e',
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