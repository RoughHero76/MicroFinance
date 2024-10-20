import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from '../../../../components/api/apiUtils';
import { CustomToast, showToast } from '../../../../components/toast/CustomToast';
import { useHomeContext } from '../../../../components/context/HomeContext';

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
        const getStatusColor = (status) => {
            switch (status) {
                case 'Approved':
                    return '#4CAF50';
                case 'Pending':
                    return '#FFA000';

                case 'Rejected':
                    return '#F44336';
                default:
                    return '#757575';
            }
        };
        if (!item) return null;
        return (
            <View style={styles.paymentItem}>
                <View style={styles.paymentInfo}>
                    <Text style={styles.amount}>₹{item.amount || 'N/A'}</Text>
                    <Text style={styles.date}>{item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : 'N/A'}</Text>
                    <Text style={[styles.status, { color: getStatusColor(item.status) }]}>{item.status || 'Unknown'}</Text>
                </View>
                <View style={styles.paymentDetails}>
                    <Text style={styles.detailText}>Method: {item.paymentMethod || 'N/A'}</Text>
                    <Text style={styles.detailText}>Remaining Amount After Payment: ₹{item.balanceAfterPayment || 'N/A'}</Text>
                    <Text style={styles.detailText}>
                        Collected by: {item.collectedBy?.fname || 'Admin'} {item.collectedBy?.lname || ''}
                    </Text>
                    <Text style={styles.detailText}>Transaction Note: {item.transactionId || 'N/A'}</Text>
                    <Text style={styles.detailText}>Logical Note: {item.logicNote || item.LogicNote || 'N/A'}</Text>
                </View>
                <View>
                    {item.status !== 'Approved' && item.status !== 'Rejected' && user.role == 'admin' && (

                        <View style={[{ flexDirection: 'row', justifyContent: 'space-between' }]}>
                            <TouchableOpacity
                                style={styles.rejectButton}
                                onPress={() => handleConfirmReject(item._id)}
                                disabled={updateRepaymentLoading}
                            >
                                <Icon name="close-circle-outline" size={20} color="#FFFFFF" />
                                {updateRepaymentLoading ? <ActivityIndicator color="white" /> : <Text style={styles.rejectButtonText}>Reject</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.approveButton}
                                onPress={() => handleApprove(item._id)}
                                disabled={updateRepaymentLoading}
                            >
                                <Icon name="check-circle-outline" size={20} color="#FFFFFF" />
                                {
                                    updateRepaymentLoading ? <ActivityIndicator color="white" /> : <Text style={styles.approveButtonText}>Approve</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (!loanId) {
        return <Text style={styles.errorText}>Error: Loan ID is missing</Text>;
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
                ListFooterComponent={loading ? <ActivityIndicator size="large" color="#6200EE" /> : null}
                ListEmptyComponent={
                    !loading && (
                        <Text style={styles.emptyText}>
                            {error || 'No payment history available.'}
                        </Text>
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
        backgroundColor: '#F5F5F5',
        padding: 10,
    },
    errorText: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
        marginTop: 20,
    },
    paymentItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        elevation: 2,
    },
    paymentInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    amount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000000',
    },
    date: {
        fontSize: 14,
        color: '#757575',
    },
    status: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    paymentDetails: {
        marginBottom: 10,
    },
    detailText: {
        fontSize: 14,
        color: '#424242',
        marginBottom: 2,
    },
    approveButton: {
        backgroundColor: '#6200EE',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 5,
    },
    approveButtonText: {
        color: '#FFFFFF',
        marginLeft: 5,
        fontWeight: 'bold',
    },
    rejectButton: {
        backgroundColor: 'red',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 5,
    },
    rejectButtonText: {
        color: '#FFFFFF',
        marginLeft: 5,
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#757575',
    },
});

export default PaymentHistory;