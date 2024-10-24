import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from '../../../../components/api/apiUtils';
import { showToast } from '../../../../components/toast/CustomToast';
import { useNavigation } from '@react-navigation/native';

const LoansView = () => {
    const navigation = useNavigation();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [filter, setFilter] = useState('');
    const [sortBy, setSortBy] = useState('loanNumber');
    const [sortOrder, setSortOrder] = useState(1);
    const [failedToLoad, setFailedToLoad] = useState(false);

    const statusOptions = ['Pending', 'Approved', 'Rejected', 'Active', 'Closed'];
    const sortOptions = [
        { label: 'Loan Number', value: 'loanNumber' },
        { label: 'Created Date', value: 'createdAt' },
        { label: 'Updated Date', value: 'updatedAt' },
    ];

    const fetchLoans = async (pageNumber) => {
        if (loading || !hasMore) return;
        setLoading(true);
        try {
            const filterParam = filter ? `&status=${filter}` : '';
            const response = await apiCall(`/api/admin/loan?includeCustomerProfile=true&page=${pageNumber}&limit=10&includeAssignedTo=true&includePenalty=true&sortBy=${sortBy}&sortOrder=${sortOrder}${filterParam}`);

            if (response.status === 'success') {
                if (pageNumber === 1) {
                    setLoans(response.data);
                } else {
                    setLoans(prevLoans => [...prevLoans, ...response.data]);
                }
                setHasMore(response.data.length === 10);
                setPage(pageNumber);
            } else {
                showToast('error', 'Error', 'Failed to fetch loans');
                setFailedToLoad(true);
            }
        } catch (error) {
            console.error(error);
            setFailedToLoad(true);
            showToast('error', 'Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleLoanPress = (loan) => {
        //Check if user wants to open loan of customer profile
        Alert.alert(
            'Open',
            'Please select below',
            [
                {
                    text: 'Customer Profile',
                    onPress: () => navigation.navigate('CustomerView', { uid: loan.customer.uid }),
                    style: 'cancel',
                },
                {
                    text: 'Loan',
                    onPress: () => navigation.navigate('LoanDetails', { loanId: loan._id }),
                },
                {
                    text: 'Close',
                    onPress: () => { },
                    style: 'cancel',
                }

            ]
        )
    };

    useEffect(() => {
        fetchLoans(1);
    }, [filter, sortBy, sortOrder]);

    const renderLoanItem = ({ item }) => (
        <TouchableOpacity
            style={styles.loanItem}
            onPress={() => handleLoanPress(item)}
        >
            <View style={styles.loanHeader}>
                <Text style={styles.loanNumber}>Loan #{item.loanNumber}</Text>
                <View style={[styles.loanStatus, { backgroundColor: getLoanStatusColor(item.status) }]}>
                    <Text style={styles.loanStatusText}>{item.status}</Text>
                </View>
            </View>
            <Text style={styles.customerName}>{item.customer.fname} {item.customer.lname}</Text>
            <View style={styles.loanDetails}>
                <Text style={styles.loanAmount}>
                    <Icon name="currency-inr" size={14} color="#4CAF50" /> {item.loanAmount}
                </Text>
                <Text style={styles.loanDuration}>
                    <Icon name="calendar-range" size={14} color="#2196F3" /> {item.loanDuration}
                </Text>
            </View>
            <Text style={styles.loanAssignee}>
                <Icon name="account" size={14} color="#666" /> {item.assignedTo?.fname} {item.assignedTo?.lname}
            </Text>
        </TouchableOpacity>
    );

    const renderFooter = () => {
        if (!loading) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color="#0000ff" />
            </View>
        );
    };

    const handleLoadMore = () => {
        if (hasMore && !loading) {
            fetchLoans(page + 1);
        }
    };

    const renderFilterButtons = () => (
        <View style={styles.filterContainer}>
            {statusOptions.map((status) => (
                <TouchableOpacity
                    key={status}
                    style={[styles.filterButton, filter === status && styles.filterButtonActive]}
                    onPress={() => setFilter(filter === status ? '' : status)}
                >
                    <Text style={[styles.filterButtonText, filter === status && styles.filterButtonTextActive]}>
                        {status}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderSortOptions = () => (
        <View style={styles.sortContainer}>
            {sortOptions.map((option) => (
                <TouchableOpacity
                    key={option.value}
                    style={[styles.sortButton, sortBy === option.value && styles.sortButtonActive]}
                    onPress={() => {
                        if (sortBy === option.value) {
                            setSortOrder(sortOrder === 1 ? -1 : 1);
                        } else {
                            setSortBy(option.value);
                            setSortOrder(1);
                        }
                    }}
                >
                    <Text style={[styles.sortButtonText, sortBy === option.value && styles.sortButtonTextActive]}>
                        {option.label}
                    </Text>
                    {sortBy === option.value && (
                        <Icon
                            name={sortOrder === 1 ? 'arrow-up' : 'arrow-down'}
                            size={16}
                            color={sortBy === option.value ? '#FFFFFF' : '#666'}
                        />
                    )}
                </TouchableOpacity>
            ))}
        </View>
    );

    if (failedToLoad) {
        return (
            <View style={styles.container}>
                <Text style={styles.failedToLoadText}>Failed to load loans</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* {renderFilterButtons()} */}
            {renderSortOptions()}
            <FlatList
                data={loans}
                renderItem={renderLoanItem}
                keyExtractor={item => item._id}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.1}
                ListFooterComponent={renderFooter}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    failedToLoadText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF0000',
        textAlign: 'center',
        marginTop: 20,
    },
    listContent: {
        paddingVertical: 12,
    },
    loanItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    loanHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    loanNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    loanStatus: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    loanStatusText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    customerName: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    loanDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    loanAmount: {
        fontSize: 14,
        color: '#4CAF50',
    },
    loanDuration: {
        fontSize: 14,
        color: '#2196F3',
    },
    loanAssignee: {
        fontSize: 14,
        color: '#666',
    },
    footer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    filterButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F0F0F0',
    },
    filterButtonActive: {
        backgroundColor: '#2196F3',
    },
    filterButtonText: {
        fontSize: 12,
        color: '#666',
    },
    filterButtonTextActive: {
        color: '#FFFFFF',
    },
    sortContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F0F0F0',
    },
    sortButtonActive: {
        backgroundColor: '#2196F3',
    },
    sortButtonText: {
        fontSize: 12,
        color: '#666',
        marginRight: 4,
    },
    sortButtonTextActive: {
        color: '#FFFFFF',
    },
});

const getLoanStatusColor = (status) => {
    switch (status.toLowerCase()) {
        case 'active':
            return '#4CAF50';
        case 'pending':
        case 'approved':
            return '#FFC107';
        case 'rejected':
            return '#F44336';
        case 'closed':
            return '#9E9E9E';
        default:
            return '#9E9E9E';
    }
};

export default LoansView;