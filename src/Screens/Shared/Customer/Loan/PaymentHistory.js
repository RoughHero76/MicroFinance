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
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);
    const route = useRoute();
    const loanId = route.params?.loanId;
    const { user } = useHomeContext();

    const fetchPayments = useCallback(async () => {
        if (loading || !hasMore || !loanId) return;
        setLoading(true);
        setError(null);
        try {
            let API_URL = user?.role === 'admin' ? 'api/admin' : 'api/employee';
            const response = await apiCall(`/${API_URL}/loan/repayment/history?page=${page}&limit=10&loanId=${loanId}`, 'GET');

            if (response?.status === 'success' && Array.isArray(response.data)) {
                if (response.data.length === 0) {
                    setHasMore(false);
                } else {
                    setPayments(prevPayments => [...prevPayments, ...response.data]);
                    setHasMore(response.data.length === 10);
                    setPage(prevPage => prevPage + 1);
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
    }, [loanId, page, loading, hasMore, user?.role]);

    useEffect(() => {
        if (loanId && hasMore && payments.length === 0) {
            fetchPayments();
        }
    }, [fetchPayments, loanId, hasMore, payments.length]);

    const handleApprove = async (paymentId) => {
        if (!paymentId) {
            showToast('error', 'Invalid payment ID');
            return;
        }
        try {
            // Implement the approval logic here
            // For example:
            // await apiCall(`/api/admin/loan/repayment/approve/${paymentId}`, 'POST');
            showToast('success', 'Payment approved successfully');
            // Refresh the payment list or update the local state
        } catch (error) {
            console.error('Error approving payment:', error);
            showToast('error', 'Failed to approve payment');
        }
    };

    const renderItem = ({ item }) => {
        const getStatusColor = (status) => {
            switch (status) {
                case 'Approved':
                    return '#4CAF50';
                case 'Pending':
                    return '#FFA000';
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
                </View>
                <View>
                    {item.status !== 'Approved' && user.role == 'admin' && (
                        <TouchableOpacity
                            style={styles.approveButton}
                            onPress={() => handleApprove(item._id)}
                        >
                            <Icon name="check-circle-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.approveButtonText}>Approve</Text>
                        </TouchableOpacity>
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
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#757575',
    },
});

export default PaymentHistory;