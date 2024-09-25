import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    TextInput,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { apiCall } from '../../../../components/api/apiUtils';
import { showToast, CustomToast } from '../../../../components/toast/CustomToast';

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

    const fetchTodaysCollections = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiCall('/api/employee/loan/collection/today', 'GET');
            if (response.status === 'success' && Array.isArray(response.data)) {
                setCollections(response.data);
            } else {
                console.error('Invalid data structure:', response);
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
            } else {
                showToast('error', 'Failed to process payment');
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
            } else {
                showToast('error', 'Failed to apply penalty');
            }
        } catch (error) {
            console.error('Error applying penalty:', error);
            showToast('error', 'Failed to apply penalty');
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.collectionItem}>
            <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{`${item.loan?.customer?.fname || 'Not'} ${item.loan?.customer?.lname || 'Available'}`} </Text>
                <Text style={styles.phoneNumber}>{item.loan?.customer?.phoneNumber}</Text>
            </View>
            <View style={styles.loanInfo}>
                <View style={styles.loanDetailRow}>
                    <Icon name="cash" size={18} color="#4A4A4A" />
                    <Text style={styles.loanDetail}>Loan: ₹{item.loan?.loanAmount}</Text>
                </View>
                <View style={styles.loanDetailRow}>
                    <Icon name="calendar-clock" size={18} color="#4A4A4A" />
                    <Text style={styles.loanDetail}>Due: ₹{item.amount} on {new Date(item.dueDate).toLocaleDateString()}</Text>
                </View>
                <View style={styles.loanDetailRow}>
                    <Icon name="numeric" size={18} color="#4A4A4A" />
                    <Text style={styles.loanDetail}>Installment: {item.loanInstallmentNumber}</Text>
                </View>
                <View style={styles.statusContainer}>
                    <Text style={[styles.status, { backgroundColor: getStatusColor(item.status) }]}>{item.status}</Text>
                    {item.penaltyApplied && (
                        <Text style={styles.penalty}>Penalty: ₹{item.amount - item.originalAmount}</Text>
                    )}
                </View>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.payButton]}
                    onPress={() => {
                        setSelectedItem(item);
                        setPaymentDetails({ ...paymentDetails, amount: item.amount.toString() });
                        setShowPaymentModal(true);
                    }}
                >
                    <Icon name="cash" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Pay</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.penaltyButton]}
                    onPress={() => {
                        setSelectedItem(item);
                        setShowPenaltyModal(true);
                    }}
                >
                    <Icon name="currency-usd" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Penalty</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderPaymentModal = () => (
        <Modal
            visible={showPaymentModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowPaymentModal(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Process Payment</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Amount"
                        placeholderTextColor="#999"
                        value={paymentDetails.amount}
                        onChangeText={(text) => setPaymentDetails(prev => ({ ...prev, amount: text }))}
                        keyboardType="numeric"
                    />
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={paymentDetails.paymentMethod}
                            onValueChange={(itemValue) => setPaymentDetails(prev => ({ ...prev, paymentMethod: itemValue }))}
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
                    </View>
                    <TextInput
                        style={styles.input}
                        placeholder="Transaction ID (optional)"
                        placeholderTextColor="#999"
                        value={paymentDetails.transactionId}
                        onChangeText={(text) => setPaymentDetails(prev => ({ ...prev, transactionId: text }))}
                    />
                    <TouchableOpacity style={styles.modalButton} onPress={handlePayment} disabled={confirmPaymentLoading}>
                        {
                            confirmPaymentLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalButtonText}>Confirm Payment</Text>
                        }
                    </TouchableOpacity>
                    {
                        confirmPaymentLoading ? null : (
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowPaymentModal(false)}>
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        )
                    }
                </View>
            </View >
        </Modal >
    );

    const renderPenaltyModal = () => (
        <Modal
            visible={showPenaltyModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowPenaltyModal(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Apply Penalty</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Penalty Amount"
                        placeholderTextColor="#999"
                        value={penaltyAmount}
                        onChangeText={setPenaltyAmount}
                        keyboardType="numeric"
                    />
                    <TouchableOpacity style={styles.modalButton} onPress={handleApplyPenalty}>
                        <Text style={styles.modalButtonText}>Confirm Penalty</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowPenaltyModal(false)}>
                        <Text style={styles.modalButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.safeArea}>

            <View style={styles.container}>
                <FlatList
                    data={collections}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        !loading && <Text style={styles.emptyText}>No collections due today.</Text>
                    }
                />
                {loading && <ActivityIndicator style={styles.loader} size="large" color="#1E88E5" />}
                {renderPaymentModal()}
                {renderPenaltyModal()}
                <CustomToast />
            </View>
        </SafeAreaView>
    );
};

const getStatusColor = (status) => {
    switch (status) {
        case 'Paid':
            return '#4CAF50';
        case 'Pending':
            return '#FFA000';
        default:
            return '#757575';
    }
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#1E88E5',
    },

    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    listContainer: {
        padding: 15,
    },
    collectionItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    customerInfo: {
        marginBottom: 10,
    },
    customerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
    },
    phoneNumber: {
        fontSize: 14,
        color: '#666666',
    },
    loanInfo: {
        marginBottom: 15,
    },
    loanDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    loanDetail: {
        fontSize: 14,
        color: '#4A4A4A',
        marginLeft: 10,
    },
    statusContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 5,
    },
    status: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFFFFF',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    penalty: {
        fontSize: 12,
        color: '#D32F2F',
        fontWeight: 'bold',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        marginHorizontal: 5,
    },
    payButton: {
        backgroundColor: '#4CAF50',
    },
    penaltyButton: {
        backgroundColor: '#FFA000',
    },
    actionButtonText: {
        color: '#FFFFFF',
        marginLeft: 5,
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#666666',
    },
    loader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 20,
        width: '90%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#CCCCCC',
        borderRadius: 5,
        padding: 12,
        marginBottom: 15,
        fontSize: 16,
        color: '#333333',
    }, pickerContainer: {
        borderWidth: 1,
        borderColor: '#CCCCCC',
        borderRadius: 5,
        marginBottom: 15,
    },
    picker: {
        height: 50,
        color: '#333333',
    },
    modalButton: {
        backgroundColor: '#1E88E5',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    cancelButton: {
        backgroundColor: '#757575',
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default TodaysCollectionScreen;