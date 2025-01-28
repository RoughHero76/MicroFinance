import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Modal,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast, CustomToast } from '../../../components/toast/CustomToast';

const RepaymentApprovalScreenOld = () => {
    const [repayments, setRepayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [approveLoadnig, setApproveLoadnig] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [filters, setFilters] = useState({
        loanNumber: '',
        defaultDate: true,
        date: new Date(),
        status: '',
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const fetchRepayments = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page,
                limit: 10,
                defaultDate: filters.defaultDate,
                date: filters.date.toISOString().split('T')[0],
                status: filters.status,
            });

            if (filters.loanNumber) {
                queryParams.append('loanNumber', filters.loanNumber);
            }

            console.log('Fetching repayments:', queryParams.toString());
            const response = await apiCall(`/api/admin/loan/repayment/history/approve?${queryParams}`, 'GET');
            if (response.status === 'success' && Array.isArray(response.data)) {
                setRepayments(prevRepayments => [...prevRepayments, ...response.data]);
                setHasMore(response.data.length === 10);
                setPage(prevPage => prevPage + 1);

            } else {
                console.error('Invalid data structure:', response);
            }
        } catch (error) {
            console.error('Error fetching repayments:', error);
            showToast('error', 'Failed to fetch repayments');
        } finally {
            setLoading(false);
        }
    }, [page, filters, loading, hasMore]);

    useEffect(() => {
        fetchRepayments();
    }, [fetchRepayments]);

    const handleApprove = async (repaymentId) => {
        try {
            setApproveLoadnig(true);
            await apiCall(`/api/admin/loan/repayment/history/approve`, 'POST', { repaymentId });
            showToast('success', 'Repayment approved successfully');
            // Refresh the repayment list
            setRepayments([]);
            setPage(1);
            setHasMore(true);
            fetchRepayments();
        } catch (error) {
            showToast('error', 'Failed to approve repayment');
        } finally {
            setApproveLoadnig(false);
        }
    };

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
            setApproveLoadnig(true);
            const response = await apiCall(`/api/admin/loan/repayment/history/reject`, 'POST', { repaymentId });
            if (response.status === 'success') {
                showToast('success', 'Repayment rejected successfully');
            } else {
                showToast('error', response.message || 'Failed to reject repayment');
            }
            setRepayments([]);
            setPage(1);
            setHasMore(true);
            fetchRepayments();
        } catch (error) {
            showToast('error', 'Failed to reject repayment');
        } finally {
            setApproveLoadnig(false);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.repaymentItem}>
            <View style={styles.repaymentInfo}>
                <Text style={styles.amount}>₹{item.amount}</Text>
                <Text style={styles.date}>{new Date(item.paymentDate).toLocaleDateString()}</Text>
                <Text style={[styles.status, { color: getStatusColor(item.status) }]}>{item.status}</Text>
            </View>
            <View style={styles.repaymentDetails}>
                <Text style={styles.detailText}>Method: {item.paymentMethod}</Text>
                <Text style={styles.detailText}>Remaining Amount: ₹{item.loan?.outstandingAmount}</Text>
                <Text style={styles.detailText}>Collected by: {item.collectedBy || 'Admin'}</Text>
                <Text style={styles.detailText}>Borrower: {item.loanDetails.borrower}</Text>
                <Text style={styles.detailText}>Loan Amount: ₹{item.loanDetails.loanAmount}</Text>
                <Text style={styles.detailText}>Transaction Note: {item.transactionId || 'N/A'} </Text>
                <Text style={styles.detailText}>Logical Note: {item.logicNote || item.LogicNote || 'N/A'}</Text>
            </View>
            {item.status !== 'Approved' && (
                <View style={[{ flexDirection: 'row', justifyContent: 'space-between' }]}>

                    <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleConfirmReject(item._id)}
                        disabled={approveLoadnig}
                    >
                        <Icon name="close-circle-outline" size={20} color="#FFFFFF" />
                        {approveLoadnig ? <ActivityIndicator color="white" /> : <Text style={styles.rejectButtonText}>Reject</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleApprove(item._id)}
                        disabled={approveLoadnig}
                    >
                        <Icon name="check-circle-outline" size={20} color="#FFFFFF" />
                        {approveLoadnig ? <ActivityIndicator color="white" /> : <Text style={styles.approveButtonText}>Approve</Text>}
                    </TouchableOpacity>

                </View>
            )}
        </View>
    );

    const renderFilters = () => (
        <Modal
            visible={showFilters}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowFilters(false)}
        >
            <View style={styles.filterModal}>
                <View style={styles.filterContent}>
                    <Text style={styles.filterTitle}>Filters</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Loan Number (optional)"
                        value={filters.loanNumber}
                        placeholderTextColor="gray"
                        onChangeText={(text) => setFilters(prev => ({ ...prev, loanNumber: text }))}
                    />
                    <View style={styles.dateContainer}>
                        <Text style={styles.dateText}>Use Default Date:</Text>
                        <TouchableOpacity
                            style={styles.dateToggle}
                            onPress={() => setFilters(prev => ({ ...prev, defaultDate: !prev.defaultDate }))}
                        >
                            <Text style={styles.dateToggleText}>{filters.defaultDate ? 'Yes' : 'No'}</Text>
                        </TouchableOpacity>
                    </View>
                    {!filters.defaultDate && (
                        <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
                            <Text style={styles.datePickerButtonText}>Select Date: {filters.date.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                    )}
                    <Picker
                        selectedValue={filters.status}
                        onValueChange={(itemValue) => setFilters(prev => ({ ...prev, status: itemValue }))}
                        style={styles.picker}
                    >
                        <Picker.Item label="All Statuses" value="" />
                        <Picker.Item label="Pending" value="Pending" />
                        <Picker.Item label="Approved" value="Approved" />
                    </Picker>
                    <TouchableOpacity style={styles.applyFiltersButton} onPress={() => {
                        setShowFilters(false);
                        setRepayments([]);
                        setPage(1);
                        setHasMore(true);
                        fetchRepayments();
                    }}>
                        <Text style={styles.applyFiltersButtonText}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
                <Icon name="filter-variant" size={24} color="#6200EE" />
                <Text style={styles.filterButtonText}>Filters</Text>
            </TouchableOpacity>
            <FlatList
                data={repayments}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                onEndReached={fetchRepayments}
                onEndReachedThreshold={0.1}
                ListFooterComponent={loading ? <ActivityIndicator size="large" color="#6200EE" /> : null}
                ListEmptyComponent={
                    !loading && <Text style={styles.emptyText}>No repayments to approve.</Text>
                }
            />
            {renderFilters()}
            {showDatePicker && (
                <DateTimePicker
                    value={filters.date}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                            setFilters(prev => ({ ...prev, date: selectedDate }));
                        }
                    }}
                />
            )}
            <CustomToast />
        </View>
    );
};

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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        padding: 10,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    filterButtonText: {
        marginLeft: 8,
        color: '#6200EE',
        fontWeight: 'bold',
    },
    repaymentItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        elevation: 2,
    },
    repaymentInfo: {
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
    repaymentDetails: {
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
        backgroundColor: '#F44336',
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
    filterModal: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    filterContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    filterTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#000000',
    },
    input: {
        borderWidth: 1,
        borderColor: '#CCCCCC',
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
        fontSize: 14,
        color: '#424242',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,

    },
    dateText: {
        fontSize: 14,
        color: '#424242',
    },
    dateToggle: {
        backgroundColor: '#6200EE',
        padding: 10,
        borderRadius: 5,
    },
    dateToggleText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    datePickerButton: {
        backgroundColor: '#6200EE',
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
    },
    datePickerButtonText: {
        color: 'black',
        fontWeight: 'bold',
    },
    picker: {
        marginBottom: 10,
        color: '#424242',
    },
    applyFiltersButton: {
        backgroundColor: '#6200EE',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
    },
    applyFiltersButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
});

export default RepaymentApprovalScreenOld;