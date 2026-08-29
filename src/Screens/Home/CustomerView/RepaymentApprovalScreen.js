import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, SectionList, StyleSheet, TouchableOpacity,
    ActivityIndicator, TextInput, Modal, Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast, CustomToast } from '../../../components/toast/CustomToast';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, type, radii, shadow } from '../../../theme/tokens';
import EviButton from '../../../components/ui/EviButton';
import StatusBadge from '../../../components/ui/StatusBadge';
import EmptyState from '../../../components/ui/EmptyState';

const RepaymentApprovalScreen = () => {
    const navigation = useNavigation();
    const [state, setState] = useState({
        repayments: [],
        loading: false,
        approveLoading: false,
        page: 1,
        hasMore: true,
        showDatePicker: false,
        showFilters: false,
        collapsedSections: new Set(),
        filters: {
            loanNumber: '',
            defaultDate: true,
            date: new Date(),
            status: ''
        }
    });

    const groupedRepayments = useMemo(() => {
        const grouped = state.repayments.reduce((acc, repayment) => {
            const collectorName = repayment.collectedBy || 'Unknown (Admin)';
            const date = new Date(repayment.paymentDate).toLocaleDateString();

            if (!acc[collectorName]) acc[collectorName] = {};
            if (!acc[collectorName][date]) acc[collectorName][date] = [];

            acc[collectorName][date].push(repayment);
            return acc;
        }, {});

        return Object.entries(grouped).map(([collector, dates]) => ({
            collector,
            data: Object.entries(dates).map(([date, items]) => ({
                date,
                items,
                totalAmount: items.reduce((sum, item) => sum + Number(item.amount), 0),
                count: items.length
            }))
        }));
    }, [state.repayments]);

    const fetchRepayments = useCallback(async () => {
        if (state.loading || !state.hasMore) return;

        setState(prev => ({ ...prev, loading: true }));
        try {
            const queryParams = new URLSearchParams({
                page: state.page,
                limit: 1000,
                defaultDate: state.filters.defaultDate,
                date: state.filters.date.toISOString().split('T')[0],
                status: state.filters.status,
                ...(state.filters.loanNumber && { loanNumber: state.filters.loanNumber })
            });

            const response = await apiCall(`/api/admin/loan/repayment/history/approve?${queryParams}`, 'GET');

            if (response.status === 'success' && Array.isArray(response.data)) {
                setState(prev => ({
                    ...prev,
                    repayments: [...prev.repayments, ...response.data],
                    hasMore: response.data.length === 10,
                    page: prev.page + 1,
                    loading: false
                }));
            }
        } catch (error) {
            showToast('error', 'Failed to fetch repayments');
            setState(prev => ({ ...prev, loading: false }));
        }
    }, [state.page, state.filters, state.loading, state.hasMore]);

    useEffect(() => { fetchRepayments(); }, [fetchRepayments]);

    const toggleSection = (collectorName) => {
        setState(prev => {
            const newCollapsed = new Set(prev.collapsedSections);
            if (newCollapsed.has(collectorName)) {
                newCollapsed.delete(collectorName);
            } else {
                newCollapsed.add(collectorName);
            }
            return { ...prev, collapsedSections: newCollapsed };
        });
    };

    const handleAction = async (repaymentId, action) => {
        const confirmMessage = action === 'approve'
            ? 'Are you sure you want to approve this repayment?'
            : 'Are you sure you want to reject this repayment?';

        Alert.alert(
            `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`,
            confirmMessage,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: action.charAt(0).toUpperCase() + action.slice(1),
                    onPress: async () => {
                        setState(prev => ({ ...prev, approveLoading: true }));
                        try {
                            const endpoint = action === 'approve' ? 'approve' : 'reject';
                            const response = await apiCall(`/api/admin/loan/repayment/history/${endpoint}`, 'POST', { repaymentId });

                            if (response.status === 'success') {
                                showToast('success', `Repayment ${action}ed successfully`);
                                setState(prev => ({
                                    ...prev,
                                    repayments: [],
                                    page: 1,
                                    hasMore: true
                                }));
                                fetchRepayments();
                            }
                        } catch (error) {
                            showToast('error', `Failed to ${action} repayment`);
                        } finally {
                            setState(prev => ({ ...prev, approveLoading: false }));
                        }
                    }
                }
            ]
        );
    };

    const renderRepayment = useCallback(({ item, sectionIndex, itemIndex }) => (
        <View style={styles.repaymentCard}>
            <View style={styles.repaymentHeader}>
                <Text style={styles.amount}>₹{Number(item.amount).toLocaleString()}</Text>
                <StatusBadge status={item.status || 'Unknown'} />
            </View>

            <View style={styles.details}>
                <DetailRow icon="credit-card" label="Method" value={item.paymentMethod} />
                <DetailRow icon="cash" label="Remaining" value={`₹${item.loan?.outstandingAmount}`} />
                <DetailRow icon="account" label="Borrower" value={item.loanDetails.borrower} />
                <DetailRow icon="bank" label="Loan Amount" value={`₹${item.loanDetails.loanAmount}`} />
                <DetailRow icon="note" label="Transaction" value={item.transactionId || 'N/A'} />
                <DetailRow icon="text" label="Note" value={item.logicNote || item.LogicNote || 'N/A'} />
            </View>

            {item.status !== 'Approved' && (
                <View style={styles.actions}>
                    <EviButton
                        title="Reject"
                        icon="close-circle-outline"
                        variant="danger"
                        size="md"
                        disabled={state.approveLoading}
                        style={styles.actionButton}
                        onPress={() => handleAction(item._id, 'reject')}
                    />
                    <EviButton
                        title="Approve"
                        icon="check-circle-outline"
                        variant="primary"
                        size="md"
                        disabled={state.approveLoading}
                        style={styles.actionButton}
                        onPress={() => handleAction(item._id, 'approve')}
                    />
                </View>
            )}
        </View>
    ), [state.approveLoading, handleAction]);

    const renderSectionHeader = ({ section }) => (
        <TouchableOpacity
            style={styles.collectorSection}
            onPress={() => toggleSection(section.collector)}
        >
            <View style={styles.collectorHeader}>
                <View style={styles.collectorTitleContainer}>
                    <Text style={styles.collectorName}>{section.collector}</Text>
                    <Icon
                        name={state.collapsedSections.has(section.collector) ? 'chevron-down' : 'chevron-up'}
                        size={24}
                        color={colors.brand}
                    />
                </View>
                {!state.collapsedSections.has(section.collector) && (
                    <View style={styles.collectorSummary}>
                        <Text style={styles.summaryText}>
                            Collections: {section.data.reduce((sum, date) => sum + date.count, 0)}
                        </Text>
                        <Text style={styles.summaryText}>
                            Total: ₹{section.data.reduce((sum, date) => sum + date.totalAmount, 0).toLocaleString()}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    const DetailRow = ({ icon, label, value }) => (
        <View style={styles.detailRow}>
            <Icon name={icon} size={16} color={colors.inkFaint} />
            <Text style={styles.detailLabel}>{label}:</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerControls}>
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setState(prev => ({ ...prev, showFilters: true }))}
                >
                    <Icon name="filter-variant" size={20} color={colors.brand} />
                    <Text style={styles.filterButtonText}>Filters</Text>
                </TouchableOpacity>
            </View>
            <SectionList
                sections={groupedRepayments}
                renderItem={({ item, section, index: itemIndex }) => (
                    !state.collapsedSections.has(section.collector) && (
                        <View style={styles.dateSection}>
                            <View style={styles.dateSectionHeader}>
                                <Text style={styles.dateText}>{item.date}</Text>
                                <View>
                                    <Text style={styles.summaryText}>
                                        Total: ₹{item.totalAmount.toLocaleString()}
                                    </Text>
                                    <Text style={styles.summaryText}>
                                        Collections: {item.count}
                                    </Text>
                                </View>
                            </View>
                            {item.items.map((repayment, repaymentIndex) => (
                                <View key={`${repayment._id}-${repaymentIndex}`}>
                                    {renderRepayment({
                                        item: repayment,
                                        sectionIndex: groupedRepayments.indexOf(section),
                                        itemIndex: repaymentIndex
                                    })}
                                </View>
                            ))}
                        </View>
                    )
                )}
                renderSectionHeader={renderSectionHeader}
                keyExtractor={(item, index) => `${item.date}-${index}`}
                onEndReached={fetchRepayments}
                onEndReachedThreshold={0.1}
                ListFooterComponent={state.loading && <ActivityIndicator size="large" color={colors.brand} />}
                ListEmptyComponent={!state.loading && (
                    <View style={styles.emptyWrap}>
                        <EmptyState
                            icon="inbox-outline"
                            title="No repayments to approve"
                            message="Repayments awaiting approval will appear here."
                        />
                    </View>
                )}
                stickySectionHeadersEnabled
            />
            <Modal
                visible={state.showFilters}
                animationType="slide"
                transparent
                onRequestClose={() => setState(prev => ({ ...prev, showFilters: false }))}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Filters</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Loan Number (optional)"
                            value={state.filters.loanNumber}
                            placeholderTextColor={colors.inkFaint}
                            onChangeText={(loanNumber) => setState(prev => ({
                                ...prev,
                                filters: { ...prev.filters, loanNumber }
                            }))}
                        />

                        <View style={styles.toggleContainer}>
                            <Text style={styles.toggleLabel}>Use Default Date</Text>
                            <TouchableOpacity
                                style={[
                                    styles.toggle,
                                    state.filters.defaultDate && styles.toggleActive
                                ]}
                                onPress={() => setState(prev => ({
                                    ...prev,
                                    filters: { ...prev.filters, defaultDate: !prev.filters.defaultDate }
                                }))}
                            >
                                <View style={[
                                    styles.toggleHandle,
                                    state.filters.defaultDate && styles.toggleHandleActive
                                ]} />
                            </TouchableOpacity>
                        </View>

                        {!state.filters.defaultDate && (
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setState(prev => ({ ...prev, showDatePicker: true }))}
                            >
                                <Icon name="calendar" size={20} color={colors.brand} />
                                <Text style={styles.dateButtonText}>
                                    {state.filters.date.toLocaleDateString()}
                                </Text>
                            </TouchableOpacity>
                        )}

                        <Picker
                            selectedValue={state.filters.status}
                            onValueChange={(status) => setState(prev => ({
                                ...prev,
                                filters: { ...prev.filters, status }
                            }))}
                            style={styles.picker}
                        >
                            <Picker.Item label="All Statuses" value="" />
                            <Picker.Item label="Pending" value="Pending" />
                            <Picker.Item label="Approved" value="Approved" />
                        </Picker>

                        <EviButton
                            title="Apply Filters"
                            icon="filter-outline"
                            variant="primary"
                            size="lg"
                            style={styles.applyButton}
                            onPress={() => {
                                setState(prev => ({
                                    ...prev,
                                    showFilters: false,
                                    repayments: [],
                                    page: 1,
                                    hasMore: true
                                }));
                                fetchRepayments();
                            }}
                        />
                    </View>
                </View>
                <CustomToast />
            </Modal>

            {state.showDatePicker && (
                <DateTimePicker
                    value={state.filters.date}
                    mode="date"
                    display="default"
                    onChange={(_, selectedDate) => {
                        setState(prev => ({
                            ...prev,
                            showDatePicker: false,
                            filters: {
                                ...prev.filters,
                                date: selectedDate || prev.filters.date
                            }
                        }));
                    }}
                />
            )}

            <CustomToast />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
        padding: spacing.lg
    },
    collectorHeader: {
        width: '100%',
    },
    collectorTitleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    collectorSection: {
        backgroundColor: colors.card,
        padding: spacing.lg,
        borderRadius: radii.lg,
        marginBottom: spacing.sm,
        ...shadow.card,
    },
    headerControls: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: spacing.lg,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.brandTint,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.pill,
    },
    filterButtonText: {
        marginLeft: spacing.sm,
        color: colors.brand,
        fontWeight: type.weights.semibold,
        fontSize: type.sizes.sm,
    },
    collectorName: {
        fontSize: type.sizes.lg,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    collectorSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    dateSection: {
        backgroundColor: colors.card,
        borderRadius: radii.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        ...shadow.card,
    },
    dateSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    dateText: {
        fontSize: type.sizes.md,
        fontWeight: type.weights.semibold,
        color: colors.brand
    },
    summaryText: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginBottom: spacing.xs
    },
    repaymentCard: {
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.line,
    },
    repaymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
        gap: spacing.md,
    },
    amount: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.bold,
        color: colors.ink
    },
    details: {
        marginTop: spacing.sm
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm
    },
    detailLabel: {
        marginLeft: spacing.sm,
        color: colors.inkSoft,
        width: 80
    },
    detailValue: {
        flex: 1,
        color: colors.ink
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.lg,
        gap: spacing.md,
    },
    actionButton: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(10, 31, 22, 0.55)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        padding: spacing.xl,
        maxHeight: '80%'
    },
    modalTitle: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.bold,
        color: colors.ink,
        marginBottom: spacing.xl
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
        color: colors.ink,
        borderWidth: 1,
        borderColor: colors.line,
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg
    },
    toggleLabel: {
        fontSize: type.sizes.md,
        color: colors.ink
    },
    toggle: {
        width: 50,
        height: 28,
        borderRadius: radii.pill,
        backgroundColor: colors.line,
        padding: 2,
        justifyContent: 'center'
    },
    toggleActive: {
        backgroundColor: colors.brand
    },
    toggleHandle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.white,
        elevation: 2
    },
    toggleHandleActive: {
        transform: [{ translateX: 22 }]
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radii.md,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.line,
    },
    dateButtonText: {
        marginLeft: spacing.sm,
        color: colors.ink,
        fontSize: type.sizes.md
    },
    picker: {
        backgroundColor: colors.surface,
        marginBottom: spacing.lg,
        borderRadius: radii.md,
        color: colors.ink,
    },
    applyButton: {
        marginTop: spacing.sm,
    },
    emptyWrap: {
        marginTop: spacing.xl,
    }
});

export default RepaymentApprovalScreen;
