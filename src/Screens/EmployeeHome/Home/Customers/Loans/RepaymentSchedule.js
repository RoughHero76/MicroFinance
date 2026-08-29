import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TextInput, TouchableOpacity, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiCall } from '../../../../../components/api/apiUtils';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, radii, type, shadow } from '../../../../../theme/tokens';
import EviButton from '../../../../../components/ui/EviButton';
import EmptyState from '../../../../../components/ui/EmptyState';

const RepaymentSchedule = () => {
    const [repaymentSchedules, setRepaymentSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState(null);
    const [dateTo, setDateTo] = useState(null);
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [totalEntries, setTotalEntries] = useState(0);
    const route = useRoute();
    const { loanId } = route.params || {};

    useEffect(() => {
        fetchRepaymentSchedules();
    }, [page]);

    const fetchRepaymentSchedules = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page,
                loanId,
                ...(searchTerm && { searchTerm }),
                ...(statusFilter && { statusFilter }),
                ...(dateFrom && { dateFrom: dateFrom.toISOString() }),
                ...(dateTo && { dateTo: dateTo.toISOString() }),
            }).toString();

            const response = await apiCall(`/api/admin/loan/repayment/schedule?${queryParams}`, 'GET');
            const { data } = response;

            setTotalEntries(data.totalEntries || 0);

            if (data && Array.isArray(data.repaymentSchedule)) {
                const newSchedules = data.repaymentSchedule;

                setRepaymentSchedules(prevSchedules => {
                    // Create a Set of the current schedule IDs
                    const existingIds = new Set(prevSchedules.map(item => item._id || item.id));

                    // Filter out the schedules that are already in the state
                    const filteredNewSchedules = newSchedules.filter(item => !existingIds.has(item._id || item.id));

                    // Combine the filtered new schedules with the existing schedules
                    return [...prevSchedules, ...filteredNewSchedules];
                });

                setTotalPages(data.totalPages || 1);
            } else {
                console.error('Invalid data structure:', data);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch repayment schedules. Please try again later.');
        } finally {
            setLoading(false);
        }
    };


    const loadMore = () => {
        if (page < totalPages) {
            setPage(prevPage => prevPage + 1);
        }
    };

    const handleClearDateRange = () => {
        setDateFrom(null);
        setDateTo(null);
    }

    const renderItem = useCallback(({ item }) => (
        <View style={styles.scheduleItem}>
            <View style={styles.scheduleHeader}>
                <View style={styles.dueDateChip}>
                    <Icon name="calendar-month-outline" size={20} color={colors.brand} />
                </View>
                <Text style={styles.dueDate}>
                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'}
                </Text>
            </View>
            <View style={styles.scheduleContent}>
                <View style={styles.scheduleRow}>
                    <Icon name="currency-inr" size={20} color={colors.success} />
                    <Text style={styles.amount}>
                        {item.amount || 'N/A'}
                    </Text>
                </View>
                <View style={styles.scheduleRow}>
                    <Icon name="alert-circle" size={20} color={getStatusColor(item.status)} />
                    <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
                        {item.status || 'N/A'}
                    </Text>
                </View>
                <View style={styles.scheduleRow}>
                    <Icon name="clock-alert-outline" size={20} color={item.penaltyApplied ? colors.danger : colors.inkSoft} />
                    <Text style={styles.penaltyApplied}>
                        Penalty: {item.penaltyApplied ? `Rs.${item.penalty.amount || '0'}` : 'N/A'}
                    </Text>
                </View>
            </View>
        </View>
    ), []);

    const renderDatePicker = (showPicker, setShowPicker, currentDate, setDate, label) => (
        <View style={styles.datePickerContainer}>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.datePickerButton}>
                <Icon name="calendar-search" size={22} color={colors.brand} />
                <View style={styles.datePickerLabelRow}>
                    <Text style={[styles.datePickerLabel, currentDate && styles.datePickerLabelActive]}>
                        {label}: {currentDate ? currentDate.toDateString() : 'Select Date'}
                    </Text>
                    <TouchableOpacity onPress={handleClearDateRange}>
                        <Icon name="close" size={20} color={colors.inkSoft} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
            {showPicker && (
                <DateTimePicker
                    value={currentDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowPicker(false);
                        if (selectedDate) {
                            setDate(selectedDate);
                        }
                    }}
                />
            )}
        </View>
    );

    const applyFilters = () => {
        setPage(1);
        setRepaymentSchedules([]);
        fetchRepaymentSchedules();
        setShowFilterModal(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.totalRepaymentSchedules}> Total: {totalEntries}</Text>
                    <Text style={styles.currentlyShowing}>Currently Showing: {repaymentSchedules.length}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterButton}>
                    <Icon name="filter-check-outline" size={24} color={colors.brand} />
                </TouchableOpacity>
            </View>
            <FlatList
                data={repaymentSchedules}
                renderItem={renderItem}
                keyExtractor={(item, index) => item._id || item.id || `repayment-${index}`}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loading ? (
                        <ActivityIndicator size="large" color={colors.brand} style={{ marginVertical: spacing.lg }} />
                    ) : (
                        !loading && page < totalPages && (
                            <EviButton
                                title="Load More"
                                variant="secondary"
                                size="md"
                                fullWidth
                                style={{ marginTop: spacing.lg }}
                                onPress={loadMore}
                            />
                        )
                    )
                }
                ListEmptyComponent={
                    <EmptyState
                        icon="calendar-search-outline"
                        title="No Schedules Found"
                        message="No repayment schedules available."
                        style={{ marginTop: spacing.xxl }}
                    />
                }
                contentContainerStyle={repaymentSchedules.length === 0 ? styles.emptyContainer : styles.listContent}
            />
            <Modal
                visible={showFilterModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFilterModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Filter Schedules</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search..."
                            placeholderTextColor={colors.inkFaint}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={statusFilter}
                                onValueChange={(itemValue) => setStatusFilter(itemValue)}
                                style={styles.picker}
                                dropdownIconColor={colors.brand}
                            >
                                <Picker.Item label="All Statuses" value="" />
                                <Picker.Item label="Pending" value="pending" />
                                <Picker.Item label="Paid" value="paid" />
                                <Picker.Item label="Overdue" value="overdue" />
                            </Picker>
                        </View>
                        {renderDatePicker(showFromDatePicker, setShowFromDatePicker, dateFrom, setDateFrom, 'From Date')}
                        {renderDatePicker(showToDatePicker, setShowToDatePicker, dateTo, setDateTo, 'To Date')}
                        <EviButton
                            title="Apply Filters"
                            variant="primary"
                            size="md"
                            fullWidth
                            style={{ marginTop: spacing.sm }}
                            onPress={applyFilters}
                        />
                        <TouchableOpacity
                            style={styles.closeChip}
                            onPress={() => setShowFilterModal(false)}
                        >
                            <Icon name="close" size={20} color={colors.ink} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'paid':
            return colors.success;
        case 'pending':
            return colors.warning;
        case 'overdue':
            return colors.danger;
        default:
            return colors.brand;
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.lg,
        backgroundColor: colors.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    totalRepaymentSchedules: {
        fontSize: type.sizes.sm,
        fontWeight: type.weights.bold,
        color: colors.brand,
    },
    currentlyShowing: {
        fontSize: type.sizes.sm,
        fontWeight: type.weights.bold,
        color: colors.inkSoft,
        marginTop: 2,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(10, 31, 22, 0.55)',
    },
    modalContent: {
        backgroundColor: colors.card,
        padding: spacing.xl,
        borderRadius: radii.xl,
        width: '90%',
        maxHeight: '80%',
        overflow: 'hidden',
        ...shadow.card,
    },
    modalTitle: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.bold,
        color: colors.ink,
        marginBottom: spacing.lg,
    },
    searchInput: {
        height: 48,
        borderColor: colors.line,
        borderWidth: 1,
        borderRadius: radii.sm,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
        color: colors.ink,
        fontSize: type.sizes.md,
        backgroundColor: colors.surface,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radii.sm,
        marginBottom: spacing.md,
        overflow: 'hidden',
        backgroundColor: colors.surface,
    },
    picker: {
        height: 50,
        color: colors.ink,
        fontSize: type.sizes.md,
    },
    datePickerContainer: {
        marginBottom: spacing.md,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: colors.line,
    },
    datePickerLabelRow: {
        marginLeft: spacing.md,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    datePickerLabel: {
        color: colors.inkSoft,
        fontSize: type.sizes.md,
    },
    datePickerLabelActive: {
        color: colors.brand,
        fontWeight: type.weights.medium,
    },
    filterButton: {
        alignSelf: 'flex-end',
    },
    scheduleItem: {
        backgroundColor: colors.card,
        padding: spacing.lg,
        borderRadius: radii.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.line,
    },
    scheduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    dueDateChip: {
        width: 36,
        height: 36,
        borderRadius: radii.md,
        backgroundColor: colors.brandTint,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dueDate: {
        marginLeft: spacing.md,
        fontSize: type.sizes.lg,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    scheduleContent: {
        marginTop: spacing.xs,
    },
    scheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    amount: {
        marginLeft: spacing.md,
        fontSize: type.sizes.lg,
        color: colors.ink,
        fontWeight: type.weights.medium,
    },
    status: {
        marginLeft: spacing.md,
        fontSize: type.sizes.lg,
        fontWeight: type.weights.medium,
    },
    penaltyApplied: {
        marginLeft: spacing.md,
        fontSize: type.sizes.lg,
        color: colors.inkSoft,
    },
    closeChip: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        width: 32,
        height: 32,
        borderRadius: radii.pill,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: spacing.xl,
    },
    emptyContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default RepaymentSchedule;
