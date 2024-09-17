import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Button, Alert, TextInput, TouchableOpacity, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiCall } from '../../../../components/api/apiUtils';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
    const { loanId } = route.params;

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
                <Icon name="calendar-month-outline" size={24} color="#6200EE" />
                <Text style={styles.dueDate}>
                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'}
                </Text>
            </View>
            <View style={styles.scheduleContent}>
                <View style={styles.scheduleRow}>
                    <Icon name="currency-inr" size={20} color="#018786" />
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
                    <Icon name="clock-alert-outline" size={20} color={item.penaltyApplied ? '#B00020' : '#757575'} />
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
                <Icon name="calendar-search" size={24} color="#6200EE" />
                <View style={[styles.datePickerLabel, { color: currentDate ? '#6200EE' : '#9CA3AF', flexDirection: 'row', }]}>
                    <Text style={styles.datePickerLabel}>
                        {label}: {currentDate ? currentDate.toDateString() : 'Select Date'}
                    </Text>
                    <TouchableOpacity onPress={handleClearDateRange}>
                        <Icon name="close" size={24} color="#6200EE" />
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
                <Text style={styles.totalRepaymentSchedules}> Total: {totalEntries}</Text>
                <Text style={styles.currentlyShowing}>Currently Showing: {repaymentSchedules.length}</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterButton}>
                    <Icon name="filter-check-outline" size={24} color="#6200EE" />
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
                        <ActivityIndicator size="large" color="#6200EE" />
                    ) : (
                        !loading && page < totalPages && (
                            <TouchableOpacity onPress={loadMore} style={styles.loadMoreButton}>
                                <Text style={styles.loadMoreText}>Load More</Text>
                            </TouchableOpacity>
                        )
                    )
                }
                ListEmptyComponent={<Text style={styles.emptyText}>No repayment schedules available.</Text>}
                contentContainerStyle={repaymentSchedules.length === 0 ? styles.emptyContainer : {}}
            />
            <Modal
                visible={showFilterModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFilterModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search..."
                            placeholderTextColor="#757575"
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={statusFilter}
                                onValueChange={(itemValue) => setStatusFilter(itemValue)}
                                style={styles.picker}
                                dropdownIconColor="#6200EE"
                            >
                                <Picker.Item label="All Statuses" value="" />
                                <Picker.Item label="Pending" value="pending" />
                                <Picker.Item label="Paid" value="paid" />
                                <Picker.Item label="Overdue" value="overdue" />
                            </Picker>
                        </View>
                        {renderDatePicker(showFromDatePicker, setShowFromDatePicker, dateFrom, setDateFrom, 'From Date')}
                        {renderDatePicker(showToDatePicker, setShowToDatePicker, dateTo, setDateTo, 'To Date')}
                        <TouchableOpacity onPress={applyFilters} style={styles.applyFiltersButton}>
                            <Text style={styles.applyFiltersText}>Apply Filters</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.closeButton}>
                            <Icon name="close-outline" size={24} color="#6200EE" />
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
            return '#018786';
        case 'pending':
            return '#FFA000';
        case 'overdue':
            return '#B00020';
        default:
            return '#6200EE';
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    totalRepaymentSchedules: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6200EE',

    },
    currentlyShowing: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6200EE',
        alignSelf: 'center',

    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '90%',
        maxHeight: '80%',
    },
    searchInput: {
        height: 40,
        borderColor: '#6200EE',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 15,
        paddingHorizontal: 10,
        color: '#000000',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#6200EE',
        borderRadius: 5,
        marginBottom: 15,
        overflow: 'hidden',
    },
    picker: {
        height: 50,

        color: '#000000',
    },
    datePickerContainer: {
        marginBottom: 15,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#6200EE',
    },
    datePickerLabel: {
        marginLeft: 10,
        color: '#000000',
    },
    applyFiltersButton: {
        backgroundColor: '#6200EE',
        paddingVertical: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    applyFiltersText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    filterButton: {
        alignSelf: 'flex-end',
        marginBottom: 10,
    },
    scheduleItem: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 5,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    scheduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    dueDate: {
        marginLeft: 10,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000000',
    },
    scheduleContent: {
        marginTop: 5,
    },
    scheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    amount: {
        marginLeft: 10,
        fontSize: 16,
        color: '#000000',
    },
    status: {
        marginLeft: 10,
        fontSize: 16,
    },
    penaltyApplied: {
        marginLeft: 10,
        fontSize: 16,
        color: '#757575',
    },
    loadMoreButton: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    loadMoreText: {
        color: '#6200EE',
    },
    emptyContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#757575',
    },
});

export default RepaymentSchedule;