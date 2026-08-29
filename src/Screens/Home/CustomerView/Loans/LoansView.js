import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from '../../../../components/api/apiUtils';
import { showToast } from '../../../../components/toast/CustomToast';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, type, radii } from '../../../../theme/tokens';
import EviCard from '../../../../components/ui/EviCard';
import StatusBadge from '../../../../components/ui/StatusBadge';
import ErrorState from '../../../../components/ui/ErrorState';

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
        <EviCard
            style={styles.loanItem}
            onPress={() => handleLoanPress(item)}
            elevated={false}
            padding={spacing.lg}
        >
            <View style={styles.loanHeader}>
                <Text style={styles.loanNumber}>Loan #{item.loanNumber}</Text>
                <StatusBadge status={item.status} />
            </View>
            <Text style={styles.customerName}>
                <Icon name="account" size={14} color={colors.inkSoft} /> {item.customer.fname} {item.customer.lname}
            </Text>
            <View style={styles.loanDetails}>
                <Text style={styles.loanAmount}>
                    <Icon name="currency-inr" size={14} color={colors.brand} /> {item.loanAmount}
                </Text>
                <Text style={styles.loanDuration}>
                    <Icon name="calendar-range" size={14} color={colors.info} /> {item.loanDuration}
                </Text>
            </View>
            <Text style={styles.loanAssignee}>
                <Icon name="account-tie" size={14} color={colors.inkSoft} /> {item.assignedTo?.fname} {item.assignedTo?.lname}
            </Text>
        </EviCard>
    );

    const renderFooter = () => {
        if (!loading) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.brand} />
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
                            color={colors.white}
                        />
                    )}
                </TouchableOpacity>
            ))}
        </View>
    );

    if (failedToLoad) {
        return (
            <View style={styles.container}>
                <ErrorState
                    message="Failed to load loans"
                    retryLabel="Retry"
                    onRetry={() => {
                        setFailedToLoad(false);
                        setHasMore(true);
                        fetchLoans(1);
                    }}
                    style={styles.errorState}
                />
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
        backgroundColor: colors.surface,
    },
    errorState: {
        marginTop: spacing.xxl,
    },
    listContent: {
        paddingVertical: spacing.md,
    },
    loanItem: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    loanHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    loanNumber: {
        fontSize: type.sizes.lg,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    customerName: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginBottom: spacing.sm,
    },
    loanDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    loanAmount: {
        fontSize: type.sizes.md,
        color: colors.brand,
        fontWeight: type.weights.medium,
    },
    loanDuration: {
        fontSize: type.sizes.md,
        color: colors.info,
    },
    loanAssignee: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
    },
    footer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: spacing.sm,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    filterButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radii.pill,
        backgroundColor: colors.surface,
    },
    filterButtonActive: {
        backgroundColor: colors.brand,
    },
    filterButtonText: {
        fontSize: type.sizes.xs,
        color: colors.inkSoft,
    },
    filterButtonTextActive: {
        color: colors.white,
    },
    sortContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: spacing.sm,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radii.pill,
        backgroundColor: colors.surface,
    },
    sortButtonActive: {
        backgroundColor: colors.brand,
    },
    sortButtonText: {
        fontSize: type.sizes.xs,
        color: colors.inkSoft,
        marginRight: spacing.xs,
    },
    sortButtonTextActive: {
        color: colors.white,
    },
});

export default LoansView;
