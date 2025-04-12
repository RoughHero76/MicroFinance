import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Button, Alert, TextInput, TouchableOpacity, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiCall } from '../../../../components/api/apiUtils';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { showToast, CustomToast } from '../../../../components/toast/CustomToast';
import EditRepaymentScheduleModal from './EditRepaymentScheduleModal';
import { useNavigation } from '@react-navigation/native';

const RepaymentSchedule = () => {


    const navigation = useNavigation();

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

    const [loanStatus, setLoanStatus] = useState('');

    //Edit Modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);

    const route = useRoute();
    const { loanId } = route.params;

    useEffect(() => {
        fetchRepaymentSchedules();
    }, [page]);

    const handleEditSchedule = (schedule) => {
        setSelectedSchedule(schedule);
        setShowEditModal(true);
    };



    const handleSaveSchedule = async (updatedSchedule) => {
        try {
            const payload = {
                id: updatedSchedule.id, // Changed from updatedSchedule._id to updatedSchedule.id
                status: updatedSchedule.status,
                amount: updatedSchedule.amount,
                paymentDate: updatedSchedule.paymentDate,
                paymentMethod: updatedSchedule.paymentMethod,
                penaltyAmount: updatedSchedule.penaltyAmount,
                penaltyReason: updatedSchedule.penaltyReason,
                penaltyAppliedDate: updatedSchedule.penaltyAppliedDate,
                transactionId: updatedSchedule.transactionId,
                collectedBy: updatedSchedule.collectedBy
            };

            console.log('Collected by: ', updatedSchedule.collectedBy);
            const response = await apiCall('/api/admin/loan/repayment/schedule/update', 'POST', payload);
            if (response.status === 'success') {
                setShowEditModal(false);
                updatedSchedule = null;
                navigation.goBack();
                showToast('success', 'Repayment schedule updated successfully');

            } else {
                showToast('error', response.message || 'Failed to update repayment schedule');
            }
        } catch (error) {
            console.error('Error updating repayment schedule:', error);
            Alert.alert('Error', 'Failed to update repayment schedule. Please try again.');
        }
    };
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
            setLoanStatus(data.loanStatus);

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
                <Text style={styles.dueDate}>
                    #{item.loanInstallmentNumber || 'N/A'}
                </Text>
            </View>
            <View style={styles.scheduleContent}>
                <View style={styles.scheduleRow}>
                    <Icon name="currency-inr" size={20} color="#018786" />
                    <Text style={styles.amount}>
                        Payment Amount: {item.amount || 'N/A'}
                    </Text>
                </View>
                <View style={styles.scheduleRow}>
                    <Icon name="currency-inr" size={20} color="#018786" />
                    <Text style={styles.amount}>
                        Original EMI: {item.originalAmount || 'N/A'}
                    </Text>
                </View>
                <View style={styles.scheduleRow}>
                    <Icon name={getIcon(item.status)} size={20} color={getStatusColor(item.status)} />
                    <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
                        {item.status || 'N/A'}
                    </Text>
                </View>
                <View style={styles.scheduleRow}>
                    <Icon name="clock-alert-outline" size={20} color={item.penaltyApplied ? '#B00020' : '#757575'} />
                    <Text style={styles.penaltyApplied}>
                        Penalty: {item.penaltyApplied ? `Rs.${item.penalty?.amount || '0'}` : 'N/A'}
                    </Text>
                </View>
                <View style={styles.scheduleRow}>
                    <Icon name="notebook-outline" size={20} color="#6200EE" />
                    <Text style={styles.logicNote}>
                        Logical Note: {item.logicNote || item.LogicNote || 'N/A'}
                    </Text>
                </View>

                {/* New section for repayments */}
                {item.repayments && item.repayments.length > 0 && (
                    <View style={styles.repaymentsSection}>
                        <Text style={styles.repaymentTitle}>Repayments:</Text>
                        {item.repayments.map((repayment, index) => (
                            <View key={index} style={styles.repaymentItem}>
                                <Text style={styles.repaymentText}>Amount: Rs.{repayment.amount}</Text>
                                <Text style={styles.repaymentText}>Date: {new Date(repayment.paymentDate).toLocaleString()}</Text>
                                <Text style={styles.repaymentText}>Method: {repayment.paymentMethod}</Text>
                                <Text style={[styles.repaymentText, { color: getStatusColor(repayment.status) }]}>Status: {repayment.status}</Text>
                                {repayment.transactionId && (
                                    <Text style={styles.repaymentText}>Transaction ID: {repayment.transactionId}</Text>
                                )}
                                {repayment.collectedBy ? (
                                    <Text style={styles.repaymentText}>
                                        Collected By:{repayment.collectedBy.fname} {repayment.collectedBy.lname}
                                    </Text>
                                ) : (
                                    <Text style={styles.repaymentText}>Collected By: Admin</Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {loanStatus.toLowerCase() === 'closed' && (
                <Text style={styles.loanClosedText}>Loan Closed</Text>
            )}

            <TouchableOpacity
                onPress={() => handleEditSchedule(item)}
                style={styles.editButton}
            >
                <Icon name="pencil" size={24} color="#6200EE" />
            </TouchableOpacity>
        </View>
    ), [loanStatus]);

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
            <EditRepaymentScheduleModal
                visible={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSave={handleSaveSchedule}
                scheduleItem={selectedSchedule}
            />
            < CustomToast />

        </View>
    );
};

const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'paid':
            return 'green';
        case 'pending':
            return 'orange';
        case 'overdue':
            return 'red';
        case 'overduepaid':
            return '#a06025';
        case 'advancepaid':
            return 'blue';
        case 'partiallypaid':
            return '#ff6f00';
        case 'partiallypaidfullypaid':
            return '#a06025';
        case 'approved':
            return '#4CAF50';

        default:
            return '#6200EE';
    }
};

const getIcon = (status) => {
    switch (status?.toLowerCase()) {
        case 'paid':
            return 'check-circle';
        case 'pending':
            return 'clock-outline';
        case 'overdue':
            return 'alert-circle';
        case 'overduepaid':
            return 'alert-circle-check';
        case 'advancepaid':
            return 'calendar-check';
        case 'partiallypaid':
            return 'progress-check';
        case 'partiallypaidfullypaid':
            return 'progress-check';
        case 'approved':
            return 'thumb-up';
        default:
            return 'help-circle';
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
    loanClosedText: {
        color: '#6200EE',
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 10,
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
    editButton: {
        position: 'absolute',
        top: 10,
        right: 10,
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
    logicNote: {
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

    /* Repayment Section */
    repaymentsSection: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        paddingTop: 10,
    },
    repaymentTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6200EE',
        marginBottom: 5,
    },
    repaymentItem: {
        backgroundColor: '#F5F5F5',
        padding: 10,
        borderRadius: 5,
        marginBottom: 5,
    },
    repaymentText: {
        fontSize: 14,
        color: '#000000',
        marginBottom: 2,
    },

});

export default RepaymentSchedule;