import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiCall } from '../../../../components/api/apiUtils';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { showToast, CustomToast } from '../../../../components/toast/CustomToast';
import EditRepaymentScheduleModal from './EditRepaymentScheduleModal';
import { colors, spacing, type, radii, shadow } from '../../../../theme/tokens';
import EviCard from '../../../../components/ui/EviCard';
import EviButton from '../../../../components/ui/EviButton';
import EviTextField from '../../../../components/ui/EviTextField';
import EmptyState from '../../../../components/ui/EmptyState';

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
    const { loanId } = route.params || {};

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
        <EviCard style={styles.scheduleItem} elevated={false} padding={spacing.lg}>
            <View style={styles.scheduleHeader}>
                <View style={styles.iconChip}>
                    <Icon name="calendar-month-outline" size={18} color={colors.brand} />
                </View>
                <Text style={styles.dueDate}>
                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'}
                </Text>
                <Text style={styles.dueDate}>
                    #{item.loanInstallmentNumber || 'N/A'}
                </Text>
            </View>
            <View style={styles.scheduleContent}>
                <View style={styles.scheduleRow}>
                    <Icon name="currency-inr" size={16} color={colors.brand} style={styles.rowIcon} />
                    <Text style={styles.amount}>
                        Payment Amount: {item.amount || 'N/A'}
                    </Text>
                </View>
                <View style={styles.scheduleRow}>
                    <Icon name="currency-inr" size={16} color={colors.brand} style={styles.rowIcon} />
                    <Text style={styles.amount}>
                        Original EMI: {item.originalAmount || 'N/A'}
                    </Text>
                </View>
                <View style={styles.scheduleRow}>
                    <Icon name={getIcon(item.status)} size={16} color={getStatusColor(item.status)} style={styles.rowIcon} />
                    <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
                        {item.status || 'N/A'}
                    </Text>
                </View>
                <View style={styles.scheduleRow}>
                    <Icon name="clock-alert-outline" size={16} color={item.penaltyApplied ? colors.danger : colors.inkFaint} style={styles.rowIcon} />
                    <Text style={styles.penaltyApplied}>
                        Penalty: {item.penaltyApplied ? `Rs.${item.penalty?.amount || '0'}` : 'N/A'}
                    </Text>
                </View>
                <View style={styles.scheduleRow}>
                    <Icon name="notebook-outline" size={16} color={colors.info} style={styles.rowIcon} />
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
                activeOpacity={0.7}
            >
                <Icon name="pencil" size={18} color={colors.brand} />
            </TouchableOpacity>
        </EviCard>
    ), [loanStatus]);

    const renderDatePicker = (showPicker, setShowPicker, currentDate, setDate, label) => (
        <View style={styles.datePickerContainer}>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.datePickerButton} activeOpacity={0.7}>
                <View style={[styles.datePickerLabel, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <Text style={[styles.datePickerLabelText, currentDate ? { color: colors.brand } : { color: colors.inkFaint }]}>
                        {label}: {currentDate ? currentDate.toDateString() : 'Select Date'}
                    </Text>
                    <TouchableOpacity onPress={handleClearDateRange}>
                        <Icon name="close" size={18} color={colors.inkFaint} />
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
                <View>
                    <Text style={styles.totalRepaymentSchedules}>Total: {totalEntries}</Text>
                    <Text style={styles.currentlyShowing}>Showing: {repaymentSchedules.length}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterChip} activeOpacity={0.7}>
                    <Icon name="filter-outline" size={16} color={colors.brand} />
                    <Text style={styles.filterChipText}>Filter</Text>
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
                        <View style={styles.footer}>
                            <ActivityIndicator size="small" color={colors.brand} />
                        </View>
                    ) : (
                        !loading && page < totalPages && (
                            <TouchableOpacity onPress={loadMore} style={styles.loadMoreButton} activeOpacity={0.7}>
                                <Text style={styles.loadMoreText}>Load More</Text>
                            </TouchableOpacity>
                        )
                    )
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <EmptyState
                            icon="calendar-search-outline"
                            title="No repayment schedules"
                            message="Installment schedules for this loan will appear here."
                        />
                    </View>
                }
            />
            <Modal
                visible={showFilterModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFilterModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <EviTextField
                            label="Search"
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                            placeholder="Search..."
                            mode="flat"
                            style={styles.searchField}
                        />
                        <View style={styles.field}>
                            <View style={styles.pickerWrap}>
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
                        </View>
                        {renderDatePicker(showFromDatePicker, setShowFromDatePicker, dateFrom, setDateFrom, 'From Date')}
                        {renderDatePicker(showToDatePicker, setShowToDatePicker, dateTo, setDateTo, 'To Date')}
                        <EviButton
                            title="Apply Filters"
                            onPress={applyFilters}
                            icon="filter-outline"
                            variant="primary"
                            size="lg"
                        />
                    </View>
                    <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.closeButton} activeOpacity={0.7}>
                        <Icon name="close" size={20} color={colors.inkSoft} />
                    </TouchableOpacity>
                </View>
                <CustomToast />
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
            return colors.success;
        case 'pending':
            return colors.warning;
        case 'overdue':
            return colors.danger;
        case 'overduepaid':
            return colors.orange;
        case 'advancepaid':
            return colors.info;
        case 'partiallypaid':
            return colors.warning;
        case 'partiallypaidfullypaid':
            return colors.orange;
        case 'approved':
            return colors.success;

        default:
            return colors.brand;
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
        backgroundColor: colors.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    totalRepaymentSchedules: {
        fontSize: type.sizes.md,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    loanClosedText: {
        color: colors.warning,
        fontWeight: type.weights.bold,
        textAlign: 'center',
        marginTop: spacing.md,
        fontSize: type.sizes.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    currentlyShowing: {
        fontSize: type.sizes.xs,
        color: colors.inkSoft,
        marginTop: 2,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.brandTint,
        borderRadius: radii.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    filterChipText: {
        fontSize: type.sizes.sm,
        color: colors.brand,
        fontWeight: type.weights.semibold,
        marginLeft: spacing.xs,
    },
    scheduleItem: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
    },
    scheduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    iconChip: {
        width: 34,
        height: 34,
        borderRadius: radii.md,
        backgroundColor: colors.brandTint,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    dueDate: {
        marginRight: spacing.md,
        fontSize: type.sizes.lg,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    scheduleContent: {
        marginTop: spacing.xs,
    },
    rowIcon: {
        marginRight: spacing.sm,
    },
    scheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    amount: {
        fontSize: type.sizes.md,
        color: colors.ink,
    },
    status: {
        fontSize: type.sizes.md,
        fontWeight: type.weights.semibold,
    },
    penaltyApplied: {
        fontSize: type.sizes.md,
        color: colors.inkSoft,
    },
    logicNote: {
        fontSize: type.sizes.md,
        color: colors.inkSoft,
    },
    editButton: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        backgroundColor: colors.brandTint,
        borderRadius: radii.pill,
        padding: spacing.sm,
    },
    loadMoreButton: {
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    loadMoreText: {
        color: colors.brand,
        fontWeight: type.weights.semibold,
        fontSize: type.sizes.md,
    },
    footer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },

    /* Repayment Section */
    repaymentsSection: {
        marginTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.line,
        paddingTop: spacing.md,
    },
    repaymentTitle: {
        fontSize: type.sizes.md,
        fontWeight: type.weights.bold,
        color: colors.ink,
        marginBottom: spacing.sm,
    },
    repaymentItem: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radii.sm,
        marginBottom: spacing.sm,
    },
    repaymentText: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginBottom: 2,
    },

    /* Filter Modal */
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
        width: '92%',
        maxHeight: '85%',
        overflow: 'hidden',
        ...shadow.card,
    },
    searchField: {
        marginBottom: spacing.lg,
    },
    field: {
        marginBottom: spacing.lg,
    },
    pickerWrap: {
        backgroundColor: colors.card,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.line,
        overflow: 'hidden',
    },
    picker: {
        height: 52,
        color: colors.ink,
    },
    datePickerContainer: {
        marginBottom: spacing.lg,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        backgroundColor: colors.card,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.line,
        height: 52,
    },
    datePickerLabel: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    datePickerLabelText: {
        fontSize: type.sizes.md,
    },
    closeButton: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radii.pill,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default RepaymentSchedule;
