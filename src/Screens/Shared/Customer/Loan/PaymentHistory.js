import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from '../../../../components/api/apiUtils';
import { CustomToast, showToast } from '../../../../components/toast/CustomToast';
import { useHomeContext } from '../../../../components/context/HomeContext';
import { colors, spacing, type, radii } from '../../../../theme/tokens';
import EviCard from '../../../../components/ui/EviCard';
import StatusBadge from '../../../../components/ui/StatusBadge';
import EmptyState from '../../../../components/ui/EmptyState';

const PaymentHistory = () => {

    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [updateRepaymentLoading, setUpdateRepaymentLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);
    const route = useRoute();
    const loanId = route.params?.loanId;
    const { user } = useHomeContext();

    const fetchPayments = useCallback(async (resetPage = false) => {
        if (loading || !loanId) return;
        setLoading(true);
        setError(null);
        try {
            const currentPage = resetPage ? 1 : page;
            let API_URL = user?.role === 'admin' ? 'api/admin' : 'api/employee';
            const response = await apiCall(`/${API_URL}/loan/repayment/history?page=${currentPage}&limit=10&loanId=${loanId}`, 'GET');

            if (response?.status === 'success' && Array.isArray(response.data)) {
                if (response.data.length === 0) {
                    setHasMore(false);
                } else {
                    setPayments(prevPayments => resetPage ? response.data : [...prevPayments, ...response.data]);
                    setHasMore(response.data.length === 10);
                    setPage(prevPage => resetPage ? 2 : prevPage + 1);
                }
            } else {
                setError(` ${response?.message || 'Unknown error'}`);
                showToast('error', ` ${response?.message || 'Unknown error'}`);
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
            setError('An error occurred while fetching payments');
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [loanId, page, loading, user?.role]);


    useEffect(() => {
        if (loanId && hasMore && payments.length === 0) {
            fetchPayments(true);
        }
    }, [fetchPayments, loanId, hasMore, payments.length]);


    const handleConfirmReject = (repaymentId) => {
        Alert.alert(
            'Confirm Reject',
            'Are you sure you want to reject this repayment? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reject', onPress: () => handleReject(repaymentId) },
            ]
        )
    }

    const handleReject = async (repaymentId) => {
        try {
            setUpdateRepaymentLoading(true);
            const response = await apiCall(`/api/admin/loan/repayment/history/reject`, 'POST', { repaymentId });
            if (response.status === 'success') {
                showToast('success', 'Repayment rejected successfully');
            } else {
                showToast('error', response.message || 'Failed to reject repayment');
            }
            fetchPayments(true);
        } catch (error) {
            showToast('error', 'Failed to reject repayment');
        } finally {
            setUpdateRepaymentLoading(false);
        }
    };



    const handleApprove = async (paymentId) => {
        if (!paymentId) {
            showToast('error', 'Invalid payment ID');
            return;
        }
        try {
            setUpdateRepaymentLoading(true);
            const response = await apiCall(`/api/admin/loan/repayment/history/approve`, 'POST', { repaymentId: paymentId });
            if (response.status === 'success') {
                showToast('success', 'Payment approved successfully');
                // Reset page and fetch payments again
                setPage(1);
                setPayments([]);
                fetchPayments(true);
            } else {
                showToast('error', response.message || 'Failed to approve payment');
            }
        } catch (error) {
            console.error('Error approving payment:', error);
            showToast('error', 'Failed to approve payment');
        } finally {
            setUpdateRepaymentLoading(false);
        }
    };

    const renderItem = ({ item }) => {
        if (!item) return null;
        const showActions = item.status !== 'Approved' && item.status !== 'Rejected' && user.role == 'admin';
        return (
            <EviCard style={styles.paymentItem} elevated={false} padding={spacing.lg}>
                <View style={styles.paymentHeader}>
                    <Text style={styles.amount}>₹{item.amount || 'N/A'}</Text>
                    <StatusBadge status={item.status || 'Unknown'} />
                </View>
                <Text style={styles.date}>
                    <Icon name="calendar" size={14} color={colors.inkFaint} /> {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : 'N/A'}
                </Text>
                <View style={styles.divider} />
                <View style={styles.paymentDetails}>
                    <Text style={styles.detailText}>
                        <Icon name="credit-card" size={14} color={colors.inkFaint} /> Method: {item.paymentMethod || 'N/A'}
                    </Text>
                    <Text style={styles.detailText}>
                        <Icon name="wallet" size={14} color={colors.inkFaint} /> Remaining After Payment: ₹{item.balanceAfterPayment || 'N/A'}
                    </Text>
                    <Text style={styles.detailText}>
                        <Icon name="account" size={14} color={colors.inkFaint} /> Collected by: {item.collectedBy?.fname || 'Admin'} {item.collectedBy?.lname || ''}
                    </Text>
                    <Text style={styles.detailText}>
                        <Icon name="receipt-outline" size={14} color={colors.inkFaint} /> Transaction: {item.transactionId || 'N/A'}
                    </Text>
                    <Text style={styles.detailText}>
                        <Icon name="note-text-outline" size={14} color={colors.inkFaint} /> Logical Note: {item.logicNote || item.LogicNote || 'N/A'}
                    </Text>
                </View>
                {showActions && (
                    <View style={styles.actionRow}>
                        <View style={styles.rejectButton}>
                            <Icon name="close-circle-outline" size={18} color={colors.danger} />
                            {updateRepaymentLoading ? <ActivityIndicator size="small" color={colors.danger} /> : <Text style={styles.rejectButtonText}>Reject</Text>}
                        </View>
                        <View style={styles.approveButton}>
                            <Icon name="check-circle-outline" size={18} color={colors.white} />
                            {
                                updateRepaymentLoading ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.approveButtonText}>Approve</Text>
                            }
                        </View>
                    </View>
                )}
            </EviCard>
        );
    };

    if (!loanId) {
        return (
            <View style={styles.container}>
                <EmptyState
                    icon="alert-circle-outline"
                    title="Loan ID is missing"
                    message="Go back and open the loan again."
                    style={styles.emptyState}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={payments}
                renderItem={renderItem}
                keyExtractor={item => item?._id?.toString() || Math.random().toString()}
                onEndReached={() => {
                    if (hasMore && !loading) {
                        fetchPayments();
                    }
                }}
                onEndReachedThreshold={0.1}
                ListFooterComponent={
                    loading ? (
                        <View style={styles.footer}>
                            <ActivityIndicator size="small" color={colors.brand} />
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyState}>
                            <EmptyState
                                icon="receipt-outline"
                                title={error ? 'Failed to load payments' : 'No payment history'}
                                message={error || 'Payments for this loan will appear here.'}
                            />
                        </View>
                    )
                }
            />
            <CustomToast />
        </View>
    );
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    emptyState: {
        marginTop: spacing.xl,
    },
    paymentItem: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    paymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    amount: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    date: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginBottom: spacing.md,
    },
    divider: {
        height: 1,
        backgroundColor: colors.line,
        marginBottom: spacing.md,
    },
    paymentDetails: {
        marginBottom: spacing.md,
    },
    detailText: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginBottom: spacing.sm,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    approveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.brand,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.sm,
        marginLeft: spacing.md,
    },
    approveButtonText: {
        color: colors.white,
        marginLeft: spacing.sm,
        fontWeight: type.weights.bold,
        fontSize: type.sizes.sm,
    },
    rejectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.dangerTint,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.sm,
    },
    rejectButtonText: {
        color: colors.danger,
        marginLeft: spacing.sm,
        fontWeight: type.weights.bold,
        fontSize: type.sizes.sm,
    },
    footer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});

export default PaymentHistory;
