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
import { apiCall } from "../../../components/api/apiUtils";
import { showToast } from "../../../components/toast/CustomToast";
import CustomToast from '../../../components/toast/CustomToast';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';
import { handleSendSMS } from '../../../components/sms/sendSMS';
import { useHomeContext } from '../../../components/context/HomeContext';
import { colors, spacing, radii, type } from '../../../theme/tokens';
import StatusBadge from '../../../components/ui/StatusBadge';
import EviButton from '../../../components/ui/EviButton';
import EviTextField from '../../../components/ui/EviTextField';
import EmptyState from '../../../components/ui/EmptyState';

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
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text style={styles.loanNumber}>Loan #{item.loan.loanNumber}</Text>
                    <Text style={styles.customerName}>
                        {item.loan.customer.fname} {item.loan.customer.lname}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.scheduleButton}
                    onPress={() => openScheduleModal(item.loan)}
                >
                    <Icon name="calendar-clock" size={18} color={colors.brand} />
                    <Text style={styles.scheduleButtonText}>Schedule</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                    <Icon name="phone" size={16} color={colors.inkFaint} />
                    <Text style={styles.detailText}>{item.loan.customer.phoneNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Icon name="map-marker" size={16} color={colors.inkFaint} />
                    <Text style={styles.detailText}>{item.loan.customer.address}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Icon name="store" size={16} color={colors.inkFaint} />
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
                    <Text style={[styles.statValue, { color: colors.danger }]}>
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
                <StatusBadge status={item.status} />
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
                        <Text style={[styles.scheduleValue, { color: colors.danger }]}>
                            Applied
                        </Text>
                    </View>
                )}
            </View>

            {['Pending', 'Overdue', 'PartiallyPaid'].includes(item.status) && userRole === 'employee' && (
                <EviButton
                    title="Pay Now"
                    icon="cash"
                    size="md"
                    fullWidth
                    style={{ marginTop: spacing.md }}
                    onPress={() => handlePayButtonPress(item)}
                />
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
                        <Icon name="close" size={20} color={colors.ink} />
                    </TouchableOpacity>
                </View>

                {scheduleData ? (
                    scheduleData.repaymentSchedules.length > 0 ? (
                        <FlatList
                            data={scheduleData.repaymentSchedules}
                            keyExtractor={(item) => item._id}
                            renderItem={renderScheduleItem}
                        />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <EmptyState
                                icon="calendar-clock"
                                title="No Schedule Data"
                                message="There are no repayment installments to show."
                            />
                        </View>
                    )
                ) : (
                    <View style={styles.modalLoading}>
                        <ActivityIndicator size="large" color={colors.brand} />
                        <Text style={styles.loadingText}>Loading schedule...</Text>
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
                            <Icon name="close" size={20} color={colors.ink} />
                        </TouchableOpacity>
                    </View>

                    <EviTextField
                        label="Amount"
                        keyboardType="numeric"
                        value={paymentDetails.amount}
                        onChangeText={(text) => setPaymentDetails({ ...paymentDetails, amount: text })}
                    />

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Payment Method</Text>
                        <View style={styles.pickerWrap}>
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

                    <EviTextField
                        label="Transaction ID"
                        value={paymentDetails.transactionId}
                        onChangeText={(text) => setPaymentDetails({ ...paymentDetails, transactionId: text })}
                        placeholder="Enter transaction ID"
                    />

                    <EviButton
                        title="Confirm Payment"
                        icon="cash"
                        size="lg"
                        fullWidth
                        loading={confirmPaymentLoading}
                        style={{ marginTop: spacing.lg }}
                        onPress={handlePayment}
                    />
                </View>
                <CustomToast />
            </View>
        </Modal>
    );

    if (loading && !data.length) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.brand} />
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
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.brand]}
                        tintColor={colors.brand}
                    />
                }
                ListEmptyComponent={() => (
                    <EmptyState
                        icon="calendar-clock"
                        title="No Loans Found"
                        message="There are no loans in this list yet."
                        style={{ marginTop: spacing.xxl }}
                    />
                )}
                ListFooterComponent={() => (
                    loadingMore ? (
                        <ActivityIndicator
                            style={styles.footerLoader}
                            size="small"
                            color={colors.brand}
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
        backgroundColor: colors.surface,
    },
    listContainer: {
        padding: spacing.lg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
    },
    loadingText: {
        marginTop: spacing.md,
        color: colors.inkSoft,
        fontSize: type.sizes.md,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: radii.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...{ shadowColor: colors.night, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    loanNumber: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginBottom: spacing.xs,
    },
    customerName: {
        fontSize: type.sizes.lg,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    scheduleButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radii.md,
        backgroundColor: colors.brandTint,
        elevation: 5,
    },
    scheduleButtonText: {
        color: colors.brand,
        marginLeft: spacing.xs,
        fontSize: type.sizes.sm,
        fontWeight: type.weights.medium,
    },
    detailsContainer: {
        marginBottom: spacing.lg,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    detailText: {
        marginLeft: spacing.sm,
        color: colors.ink,
        fontSize: type.sizes.md,
        flex: 1,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: colors.line,
        paddingTop: spacing.lg,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: type.sizes.xs,
        color: colors.inkSoft,
        marginBottom: spacing.xs,
    },
    statValue: {
        fontSize: type.sizes.md,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    footerLoader: {
        marginVertical: spacing.lg,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    modalTitle: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: radii.pill,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    scheduleItem: {
        backgroundColor: colors.card,
        margin: spacing.sm,
        borderRadius: radii.md,
        padding: spacing.lg,
        elevation: 1,
    },
    scheduleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    installmentNumber: {
        fontSize: type.sizes.lg,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    scheduleDetails: {
        backgroundColor: colors.surface,
        borderRadius: radii.sm,
        padding: spacing.md,
    },
    scheduleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    scheduleLabel: {
        color: colors.inkSoft,
        fontSize: type.sizes.md,
    },
    scheduleValue: {
        color: colors.ink,
        fontSize: type.sizes.md,
        fontWeight: type.weights.medium,
    },
    paymentModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(10, 31, 22, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    paymentModalContent: {
        backgroundColor: colors.card,
        width: '100%',
        maxWidth: 400,
        borderRadius: radii.xl,
        padding: spacing.xl,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    paymentModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    paymentModalTitle: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    formGroup: {
        marginTop: spacing.lg,
    },
    label: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginBottom: spacing.sm,
        fontWeight: type.weights.medium,
    },
    pickerWrap: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radii.md,
        overflow: 'hidden',
    },
    picker: {
        height: 48,
        color: colors.ink,
        fontSize: type.sizes.md,
    },
});

export default LoanStatusDetailsScreen;
