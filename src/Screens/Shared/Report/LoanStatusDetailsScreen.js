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
    TextInput,
    Alert,
} from 'react-native';
import { apiCall } from "../../../components/api/apiUtils";
import { showToast } from "../../../components/toast/CustomToast";
import CustomToast from '../../../components/toast/CustomToast';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';
import { handleSendSMS } from '../../../components/sms/sendSMS';
import { useHomeContext } from '../../../components/context/HomeContext';

const LoanStatusDetailsScreen = ({ route, navigation }) => {
    const { type, smaLevel, assignedTo } = route.params;
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
        totalResults: 0
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
                Alert.alert(
                    "Send SMS",
                    "Do you want to send SMS to customer?",
                    [
                        { text: "No", style: "cancel" },
                        {
                            text: "Yes",
                            onPress: () => handleSendSMS(
                                selectedLoan.customer.phoneNumber,
                                `Your loan payment of Rs. ${paymentDetails.amount} is successfully processed.`
                            ),
                        },
                    ]
                );
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
            title: type === 'sma' ? `SMA ${smaLevel} Details` : 'NPA Details'
        });
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
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.loanNumber}>Loan #{item.loan.loanNumber}</Text>
                    <Text style={styles.customerName}>
                        {item.loan.customer.fname} {item.loan.customer.lname}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.scheduleButton}
                    onPress={() => openScheduleModal(item.loan)}
                >
                    <Icon name="calendar-clock" size={20} color="#2196F3" />
                    <Text style={styles.scheduleButtonText}>Schedule</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                    <Icon name="phone" size={16} color="#78909C" />
                    <Text style={styles.detailText}>{item.loan.customer.phoneNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Icon name="map-marker" size={16} color="#78909C" />
                    <Text style={styles.detailText}>{item.loan.customer.address}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Icon name="store" size={16} color="#78909C" />
                    <Text style={styles.detailText}>{item.loan.businessAddress}</Text>
                </View>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Loan Amount</Text>
                    <Text style={styles.statValue}>₹{item.loan.loanAmount.toLocaleString()}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Overdue</Text>
                    <Text style={[styles.statValue, { color: '#FF5252' }]}>
                        ₹{item.totalOverdue.toLocaleString()}
                    </Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Paid</Text>
                    <Text style={styles.statValue}>₹{item.loan.totalPaid.toLocaleString()}</Text>
                </View>
            </View>
        </View>
    );

    const renderScheduleItem = ({ item }) => (
        <View style={styles.scheduleItem}>
            <View style={styles.scheduleHeader}>
                <Text style={styles.installmentNumber}>
                    #{item.loanInstallmentNumber}
                </Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'Paid' ? '#4CAF50' : '#FF5252' }
                ]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.scheduleDetails}>
                <View style={styles.scheduleRow}>
                    <Text style={styles.scheduleLabel}>Due Date</Text>
                    <Text style={styles.scheduleValue}>
                        {format(new Date(item.dueDate), 'dd MMM yyyy')}
                    </Text>
                </View>
                <View style={styles.scheduleRow}>
                    <Text style={styles.scheduleLabel}>Amount</Text>
                    <Text style={styles.scheduleValue}>
                        ₹{item.amount.toLocaleString()}
                    </Text>
                </View>
                {item.penaltyApplied && (
                    <View style={styles.scheduleRow}>
                        <Text style={styles.scheduleLabel}>Penalty</Text>
                        <Text style={[styles.scheduleValue, { color: '#FF5252' }]}>
                            Applied
                        </Text>
                    </View>
                )}
            </View>

            {['Pending', 'Overdue', 'PartiallyPaid'].includes(item.status) && userRole === 'employee' && (
                <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => handlePayButtonPress(item)}
                >
                    <Icon name="cash" size={20} color="white" />
                    <Text style={styles.payButtonText}>Pay Now</Text>
                </TouchableOpacity>
            )}
        </View>
    );

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
                    >
                        <Icon name="close" size={24} color="#263238" />
                    </TouchableOpacity>
                </View>

                {scheduleData ? (
                    <FlatList
                        data={scheduleData.repaymentSchedules}
                        keyExtractor={(item) => item._id}
                        renderItem={renderScheduleItem}
                    />
                ) : (
                    <View style={styles.modalLoading}>
                        <ActivityIndicator size="large" color="#2196F3" />
                        <Text>Loading schedule...</Text>
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );

    const renderPaymentModal = () => (
        <Modal
            visible={showPaymentModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowPaymentModal(false)}
        >
            <View style={styles.paymentModalOverlay}>
                <View style={styles.paymentModalContent}>
                    <View style={styles.paymentModalHeader}>
                        <Text style={styles.paymentModalTitle}>Process Payment</Text>
                        <TouchableOpacity
                            onPress={() => setShowPaymentModal(false)}
                            style={styles.closeButton}
                        >
                            <Icon name="close" size={24} color="#263238" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.paymentForm}>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Amount</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={paymentDetails.amount}
                                onChangeText={(text) => setPaymentDetails({ ...paymentDetails, amount: text })}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Payment Method</Text>
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
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Transaction ID</Text>
                            <TextInput
                                style={styles.input}
                                value={paymentDetails.transactionId}
                                onChangeText={(text) => setPaymentDetails({ ...paymentDetails, transactionId: text })}
                                placeholder="Enter transaction ID"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.confirmButton, confirmPaymentLoading && styles.disabledButton]}
                            onPress={handlePayment}
                            disabled={confirmPaymentLoading}
                        >
                            {confirmPaymentLoading ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={styles.confirmButtonText}>Confirm Payment</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    if (loading && !data.length) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Loading loans...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={data}
                renderItem={renderLoanCard}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContainer}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                ListFooterComponent={() => (
                    loadingMore ? (
                        <ActivityIndicator
                            style={styles.footerLoader}
                            size="small"
                            color="#2196F3"
                        />
                    ) : null
                )}
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
        backgroundColor: '#F5F7FA',
    },
    listContainer: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#2196F3',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    loanNumber: {
        fontSize: 14,
        color: '#78909C',
        marginBottom: 4,
    },
    customerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#263238',
    },
    scheduleButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#E3F2FD',
        elevation: 5,
    },
    scheduleButtonText: {
        color: '#2196F3',
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '500',
    },
    detailsContainer: {
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailText: {
        marginLeft: 8,
        color: '#37474F',
        flex: 1,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        paddingTop: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: 'black',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#263238',
    },
    footerLoader: {
        marginVertical: 16,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#263238',
    },
    closeButton: {
        padding: 8,
    },
    modalLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scheduleItem: {
        backgroundColor: 'white',
        margin: 8,
        borderRadius: 12,
        padding: 16,
        elevation: 1,
    },
    scheduleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    installmentNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#263238',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    scheduleDetails: {
        backgroundColor: '#F5F7FA',
        borderRadius: 8,
        padding: 12,
    },
    scheduleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    scheduleLabel: {
        color: '#78909C',
        fontSize: 14,
    },
    scheduleValue: {
        color: '#263238',
        fontSize: 14,
        fontWeight: '500',
    },
    paymentModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    paymentModalContent: {
        backgroundColor: 'white',
        width: '90%',
        borderRadius: 12,
        padding: 20,
        maxHeight: '80%',
    },
    paymentModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    paymentModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#263238',
    },
    paymentForm: {
        gap: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        color: '#78909C',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: 'black',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        color: 'black',
    },
    confirmButton: {
        backgroundColor: '#2196F3',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.7,
    },
    payButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2196F3',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
    },
    payButtonText: {
        color: 'white',
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '500',
    },
});

export default LoanStatusDetailsScreen;