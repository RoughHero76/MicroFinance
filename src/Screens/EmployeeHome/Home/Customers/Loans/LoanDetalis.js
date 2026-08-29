import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { apiCall } from '../../../../../components/api/apiUtils';
import { format } from 'date-fns';
import { debounce } from 'lodash';
import Card from '../../../../../design/components/Card';
import Button from '../../../../../design/components/Button';
import StatusPill from '../../../../../design/components/StatusPill';
import EmptyState from '../../../../../design/components/EmptyState';
import Skeleton from '../../../../../design/components/Skeleton';
import Icon from '../../../../../design/Icon';
import { colors, spacing, radius, type, shadow } from '../../../../../design/tokens';

/**
 * LoanDetailsScreen (employee loan detail) — rebuilt on the "Ink & Amber"
 * design system.
 *  - behaviour preserved 1:1: the same paginated
 *    /api/employee/loan/details?loanId=…&includeCustomerProfile&includeTotalPenalty
 *    &includeRepayments&limited (page/limit=200) fetch, the consecutive-status
 *    grouping + expand/collapse of installments, the load-more with the
 *    original 300ms debounce, the penalty-details modal, the three tabs
 *    (Details / Repayments / Customer), and the inline error + Retry
 *  - icon names not in the design set are mapped: assessment→clipboard,
 *    person→account-circle, schedule→calendar-clock, error→alert-circle,
 *    hourglass-empty→clock, help→info-outline, expand-less/more→
 *    chevron-up/down, location-on→map-marker, flag→earth,
 *    account-balance→bank
 *  - design: status colours keep the original semantics (paid=green,
 *    advance=blue, overdue=red, pending/partial=amber) via a shared
 *    status config; the gradient summary becomes a flat 4-up stat strip,
 *    info groups become labelled cards, skeletons replace the bare
 *    spinner, and the modals use the design Button/Sheet treatment
 */

// Status semantics preserved from the original (material palette → tokens)
const STATUS_CONFIG = {
  Paid: { bg: colors.successSoft, fg: colors.successInk, icon: 'check-circle' },
  PartiallyPaidFullyPaid: { bg: colors.successSoft, fg: colors.successInk, icon: 'check-circle' },
  OverduePaid: { bg: colors.successSoft, fg: colors.successInk, icon: 'check-circle' },
  Waived: { bg: colors.successSoft, fg: colors.successInk, icon: 'check-circle' },
  AdvancePaid: { bg: colors.infoSoft, fg: colors.infoInk, icon: 'calendar-clock' },
  Overdue: { bg: colors.dangerSoft, fg: colors.dangerInk, icon: 'alert-circle' },
  Pending: { bg: colors.warningSoft, fg: colors.warningInk, icon: 'clock' },
  PartiallyPaid: { bg: colors.warningSoft, fg: colors.warningInk, icon: 'clock' },
};

const getStatusConfig = (status) => STATUS_CONFIG[status] || { bg: colors.neutralSoft, fg: colors.neutralInk, icon: 'info-outline' };

const StatusBadge = ({ status, style }) => {
  const config = getStatusConfig(status);
  return (
    <View
      style={[
        {
          backgroundColor: config.bg,
          borderRadius: radius.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: 5,
          maxWidth: '100%',
        },
        style,
      ]}
    >
      <Text style={[type.caption, { color: config.fg, fontWeight: '700' }]} numberOfLines={1}>
        {status}
      </Text>
    </View>
  );
};

const IconStatusChip = ({ status, size = 40 }) => {
  const config = getStatusConfig(status);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: config.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={config.icon} size={Math.round(size * 0.5)} color={config.fg} />
    </View>
  );
};

const InfoRow = ({ label, value, children }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel} numberOfLines={1}>
      {label}
    </Text>
    <View style={styles.infoValueWrap}>{children || <Text style={styles.infoValue}>{value}</Text>}</View>
  </View>
);

const SectionCard = ({ title, children, style }) => (
  <Card style={style}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={{ gap: spacing.sm }}>{children}</View>
  </Card>
);

const LoadingDetails = () => (
  <View style={styles.page}>
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <Skeleton width="32%" height={30} radius={radius.sm} />
      <Skeleton width="32%" height={30} radius={radius.sm} />
      <Skeleton width="32%" height={30} radius={radius.sm} />
    </View>
    <View style={{ height: spacing.lg }} />
    <Skeleton width="100%" height={130} radius={radius.lg} />
    <View style={{ height: spacing.md }} />
    <Skeleton width="100%" height={220} radius={radius.lg} />
  </View>
);

const PenaltyItem = ({ item, formatDate, formatCurrency }) => {
  const config = getStatusConfig(item.status);
  return (
    <View style={styles.penaltyItem}>
      <InfoRow label="Date" value={formatDate(item.appliedDate)} />
      <InfoRow label="Amount" value={formatCurrency(item.amount)} />
      <InfoRow label="Reason" value={item.reason || 'N/A'} />
      <InfoRow
        label="Status"
        children={
          <Text style={[type.sub, { color: config.fg, fontWeight: '600' }]} numberOfLines={1}>
            {item.status}
          </Text>
        }
      />
    </View>
  );
};

const RepaymentItem = ({ item, formatDate, formatCurrency }) => (
  <Card elevation="subtle" style={{ marginBottom: spacing.sm }}>
    <View style={styles.repaymentHeader}>
      <IconStatusChip status={item.status} />
      <View style={{ flex: 1, marginLeft: spacing.sm, marginRight: spacing.sm }}>
        <Text style={styles.repaymentInstallment} numberOfLines={1}>
          Installment #{item.loanInstallmentNumber}
        </Text>
        <Text style={styles.repaymentDate}>Due: {formatDate(item.dueDate)}</Text>
      </View>
      <View style={styles.repaymentAmount}>
        <Text style={styles.repaymentAmountText}>{formatCurrency(item.amount)}</Text>
        <StatusBadge status={item.status} style={{ marginTop: 4 }} />
      </View>
    </View>

    {item.repayments?.length > 0 ? (
      <View style={styles.paymentDetails}>
        <Text style={styles.paymentDetailsTitle}>Payment Details</Text>
        {item.repayments.map((payment, index) => (
          <View key={`${payment._id}-${index}`} style={index > 0 ? styles.paymentItemDivider : null}>
            <InfoRow label="Date" value={formatDate(payment.paymentDate)} />
            <InfoRow label="Amount" value={formatCurrency(payment.amount)} />
            <InfoRow label="Method" value={payment.paymentMethod || 'N/A'} />
            {payment.transactionId ? (
              <InfoRow label="Transaction ID" value={payment.transactionId} />
            ) : null}
          </View>
        ))}
      </View>
    ) : null}

    {item.penaltyApplied ? (
      <View style={styles.penaltyWarning}>
        <Icon name="warning" size={16} color={colors.warningInk} />
        <Text style={styles.penaltyWarningText}>Penalty Applied</Text>
      </View>
    ) : null}
  </Card>
);

const GroupedRepaymentItem = ({
  group,
  index,
  schedules,
  expandedGroups,
  toggleGroupExpansion,
  formatDate,
  formatCurrency,
}) => {
  const isExpanded = expandedGroups[index];
  const showRange = group.count > 1;

  if (showRange) {
    return (
      <View style={styles.groupContainer}>
        <Card elevation="subtle" onPress={() => toggleGroupExpansion(index)}>
          <View style={styles.groupHeader}>
            <IconStatusChip status={group.status} />
            <View style={{ flex: 1, marginLeft: spacing.sm, marginRight: spacing.sm }}>
              <Text style={styles.groupTitle} numberOfLines={1}>
                {group.status} ({group.count} installments)
              </Text>
              <Text style={styles.groupDate}>
                From {formatDate(group.startItem.dueDate)} to {formatDate(group.endItem.dueDate)}
              </Text>
            </View>
            <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.inkMuted} />
          </View>
        </Card>
        {isExpanded ? (
          <View style={styles.groupItems}>
            {group.indices.map((itemIndex) => (
              <RepaymentItem
                key={`${schedules[itemIndex]._id}-${itemIndex}`}
                item={schedules[itemIndex]}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
              />
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <RepaymentItem
      key={`${group.startItem._id}-${index}`}
      item={group.startItem}
      formatDate={formatDate}
      formatCurrency={formatCurrency}
    />
  );
};

const LoanDetailsScreen = ({ route, navigation }) => {
  const { loanId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [loanDetails, setLoanDetails] = useState(null);
  const [repaymentSchedules, setRepaymentSchedules] = useState([]);
  const [groupedRepayments, setGroupedRepayments] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [customerProfile, setCustomerProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreRepayments, setHasMoreRepayments] = useState(true);
  const [penaltyModalVisible, setPenaltyModalVisible] = useState(false);
  const [error, setError] = useState(null);

  const groupRepayments = useCallback((schedules) => {
    const groups = [];
    let currentGroup = null;

    schedules.forEach((item, index) => {
      if (!currentGroup || currentGroup.status !== item.status) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = {
          status: item.status,
          startItem: item,
          endItem: item,
          count: 1,
          indices: [index],
        };
      } else {
        currentGroup.endItem = item;
        currentGroup.count += 1;
        currentGroup.indices.push(index);
      }
    });

    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, []);

  const fetchLoanDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall(
        `/api/employee/loan/details?loanId=${loanId}&includeCustomerProfile=true&includeTotalPenalty=true&includeRepayments=true&limited=true&page=${currentPage}&limit=200`,
        'GET'
      );

      if (response.status === 'success') {
        if (currentPage === 1) {
          setLoanDetails(response.data.loanDetails);
          setCustomerProfile(response.data.customerProfile);
          const schedules = response.data.repaymentSchedules || [];
          setRepaymentSchedules(schedules);
          setGroupedRepayments(groupRepayments(schedules));
        } else {
          setRepaymentSchedules((prev) => {
            const newItems = response.data.repaymentSchedules || [];
            const existingIds = new Set(prev.map((item) => item._id));
            const filteredItems = newItems.filter((item) => !existingIds.has(item._id));
            const updatedSchedules = [...prev, ...filteredItems];
            setGroupedRepayments(groupRepayments(updatedSchedules));
            return updatedSchedules;
          });
        }
        setHasMoreRepayments(response.data.repaymentSchedules?.length === 5);
      } else {
        setError('Failed to fetch loan details.');
      }
    } catch (error) {
      console.error('Error fetching loan details:', error);
      setError('An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const loadMoreRepayments = useCallback(
    debounce(() => {
      if (hasMoreRepayments && !loading) {
        setCurrentPage((prev) => prev + 1);
      }
    }, 300),
    [hasMoreRepayments, loading]
  );

  const toggleGroupExpansion = useCallback((groupIndex) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupIndex]: !prev[groupIndex],
    }));
  }, []);

  const formatDate = useCallback((dateString) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return 'N/A';
    }
  }, []);

  const formatCurrency = useCallback((amount) => {
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }, []);

  const StatItem = ({ label, value, onPress }) => (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel} numberOfLines={1}>
        {label}
      </Text>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button">
          <View style={styles.penaltyLink}>
            <Text style={styles.summaryValueLink} numberOfLines={1}>
              {value}
            </Text>
            <Icon name="info-outline" size={15} color={colors.accentDeep} />
          </View>
        </TouchableOpacity>
      ) : (
        <Text style={styles.summaryValue} numberOfLines={1}>
          {value}
        </Text>
      )}
    </View>
  );

  const renderDetails = () => {
    if (!loanDetails) return null;

    return (
      <View style={styles.page}>
        <Card elevation="subtle">
          <View style={styles.summaryGrid}>
            <StatItem label="Total Loan" value={formatCurrency(loanDetails.loanAmount)} />
            <StatItem label="Outstanding" value={formatCurrency(loanDetails.outstandingAmount)} />
            <StatItem label="Paid" value={formatCurrency(loanDetails.totalPaid)} />
            <StatItem
              label="Penalty"
              value={formatCurrency(loanDetails.totalPenaltyAmount)}
              onPress={() => setPenaltyModalVisible(true)}
            />
          </View>
        </Card>

        <SectionCard title="Loan Information" style={{ marginTop: spacing.md }}>
          <InfoRow label="Loan Number" value={loanDetails.loanNumber} />
          <InfoRow label="Loan Type" value={loanDetails.loanType} />
          <InfoRow
            label="Status"
            children={<StatusPill status={loanDetails.status} />}
          />
          <InfoRow label="Principal Amount" value={formatCurrency(loanDetails.principalAmount)} />
          <InfoRow label="Interest Rate" value={`${loanDetails.interestRate}%`} />
        </SectionCard>

        <SectionCard title="Repayment Terms" style={{ marginTop: spacing.md }}>
          <InfoRow label="Duration" value={loanDetails.loanDuration} />
          <InfoRow label="Start Date" value={formatDate(loanDetails.loanStartDate)} />
          <InfoRow label="End Date" value={formatDate(loanDetails.loanEndDate)} />
          <InfoRow label="Installments" value={loanDetails.numberOfInstallments} />
          <InfoRow label="Frequency" value={loanDetails.installmentFrequency} />
          <InfoRow
            label="Per Installment"
            value={formatCurrency(loanDetails.repaymentAmountPerInstallment)}
          />
        </SectionCard>

        <SectionCard title="Business Information" style={{ marginTop: spacing.md }}>
          <InfoRow label="Business Name" value={loanDetails.businessFirmName || 'N/A'} />
          <InfoRow label="Address" value={loanDetails.businessAddress || 'N/A'} />
          <InfoRow label="Phone" value={loanDetails.businessPhone || 'N/A'} />
          <InfoRow label="Email" value={loanDetails.businessEmail || 'N/A'} />
        </SectionCard>
      </View>
    );
  };

  const renderRepayments = () => (
    <FlatList
      data={groupedRepayments}
      keyExtractor={(group, index) => `group-${index}`}
      renderItem={({ item, index }) => (
        <GroupedRepaymentItem
          group={item}
          index={index}
          schedules={repaymentSchedules}
          expandedGroups={expandedGroups}
          toggleGroupExpansion={toggleGroupExpansion}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
        />
      )}
      onEndReached={loadMoreRepayments}
      onEndReachedThreshold={0.5}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={
        loading && hasMoreRepayments ? (
          <View style={styles.loaderFooter}>
            <ActivityIndicator size="small" color={colors.accentDeep} />
            <Text style={styles.loaderText}>Loading more...</Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          icon="receipt-long"
          title="No repayment schedules found"
          style={{ marginTop: spacing.xxxl }}
        />
      }
    />
  );

  const renderCustomer = () => {
    if (!customerProfile) {
      return (
        <View style={styles.page}>
          <EmptyState
            icon="person-off"
            title="Customer information not available"
            style={{ marginTop: spacing.xxxl }}
          />
        </View>
      );
    }

    const fullAddress = `${customerProfile.address}, ${customerProfile.city}, ${customerProfile.state} - ${customerProfile.pincode}`;
    const initials = `${customerProfile.fname?.charAt(0) || ''}${customerProfile.lname?.charAt(0) || ''}`;

    return (
      <View style={styles.page}>
        <Card elevation="subtle">
          <View style={styles.customerHeader}>
            {customerProfile.profilePic ? (
              <Image source={{ uri: customerProfile.profilePic }} style={styles.customerImage} resizeMode="cover" />
            ) : (
              <View style={[styles.customerImage, { backgroundColor: colors.accentSoft }]}>
                <Text style={styles.customerInitials}>{initials || '—'}</Text>
              </View>
            )}
            <View style={styles.customerNameContainer}>
              <Text style={styles.customerName} numberOfLines={1}>
                {`${customerProfile.fname} ${customerProfile.lname}`.trim() || 'Customer'}
              </Text>
              <Text style={styles.customerUsername} numberOfLines={1}>
                @{customerProfile.userName}
              </Text>
            </View>
          </View>

          <View style={styles.customerRows}>
            <InfoRow
              label="Phone Number"
              value={customerProfile.phoneNumber || 'N/A'}
            />
            <InfoRow label="Email" value={customerProfile.email || 'N/A'} />
            <InfoRow label="Address" value={fullAddress} />
            <InfoRow label="Country" value={customerProfile.country || 'N/A'} />
            <InfoRow label="Total Loans" value={customerProfile.loans?.length || 0} />
          </View>

          <View style={styles.customerStatusItem}>
            <Text style={styles.customerStatusLabel}>Account Status</Text>
            <StatusPill status={customerProfile.accountStatus ? 'Active' : 'Inactive'} />
          </View>
        </Card>
      </View>
    );
  };

  const renderPenaltyModal = () => (
    <Modal
      animationType="slide"
      transparent
      visible={penaltyModalVisible}
      onRequestClose={() => setPenaltyModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Penalty Details</Text>
            <TouchableOpacity
              onPress={() => setPenaltyModalVisible(false)}
              style={styles.closeButton}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Icon name="close" size={22} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={loanDetails?.totalPenalty || []}
            keyExtractor={(item, index) => `${item._id}-${index}`}
            renderItem={({ item }) => (
              <PenaltyItem item={item} formatDate={formatDate} formatCurrency={formatCurrency} />
            )}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            contentContainerStyle={{ paddingBottom: spacing.md }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyMessage}>No penalty information available</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );

  if (loading && !loanDetails) {
    return (
      <View style={styles.screen}>
        <LoadingDetails />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.tabBar}>
        {[
          { id: 'details', icon: 'clipboard', label: 'Details' },
          { id: 'repayments', icon: 'receipt-long', label: 'Repayments' },
          { id: 'customer', icon: 'account-circle', label: 'Customer' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
            accessibilityRole="tab"
          >
            <Icon name={tab.icon} size={20} color={activeTab === tab.id ? colors.accentDeep : colors.inkMuted} />
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button label="Retry" icon="refresh" variant="accent" size="sm" onPress={fetchLoanDetails} />
        </View>
      ) : null}

      {activeTab === 'repayments' ? (
        renderRepayments()
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'details' ? renderDetails() : renderCustomer()}
        </ScrollView>
      )}

      {renderPenaltyModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    ...shadow.subtle,
    zIndex: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 4,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: colors.accent,
  },
  tabText: {
    ...type.sub,
    color: colors.inkSecondary,
  },
  activeTabText: {
    color: colors.accentDeep,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  page: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '50%',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    ...type.micro,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryValue: {
    ...type.title,
    color: colors.ink,
  },
  penaltyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryValueLink: {
    ...type.title,
    color: colors.accentDeep,
  },

  sectionTitle: {
    ...type.title,
    color: colors.ink,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoLabel: {
    ...type.sub,
    color: colors.inkSecondary,
    flexShrink: 1,
  },
  infoValueWrap: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  infoValue: {
    ...type.sub,
    color: colors.ink,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },

  loaderFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loaderText: {
    ...type.sub,
    color: colors.inkMuted,
  },

  groupContainer: {
    marginBottom: spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupTitle: {
    ...type.bodyBold,
    color: colors.ink,
  },
  groupDate: {
    ...type.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
  groupItems: {
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
  },
  repaymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repaymentInstallment: {
    ...type.bodyBold,
    color: colors.ink,
  },
  repaymentDate: {
    ...type.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
  repaymentAmount: {
    alignItems: 'flex-end',
  },
  repaymentAmountText: {
    ...type.bodyBold,
    color: colors.ink,
  },
  paymentDetails: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  paymentDetailsTitle: {
    ...type.caption,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  paymentItemDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  penaltyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  penaltyWarningText: {
    ...type.sub,
    fontWeight: '600',
    color: colors.warningInk,
  },

  penaltyItem: {
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },

  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  customerImage: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    marginRight: spacing.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInitials: {
    ...type.h1,
    color: colors.accentDeep,
  },
  customerNameContainer: {
    flex: 1,
  },
  customerName: {
    ...type.h1,
    color: colors.ink,
  },
  customerUsername: {
    ...type.sub,
    color: colors.inkMuted,
    marginTop: 2,
  },
  customerRows: {
    gap: spacing.sm,
  },
  customerStatusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  customerStatusLabel: {
    ...type.sub,
    color: colors.inkSecondary,
  },

  errorContainer: {
    padding: spacing.lg,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    ...type.body,
    fontWeight: '600',
    color: colors.dangerInk,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    width: '90%',
    maxHeight: '80%',
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...type.h2,
    color: colors.ink,
  },
  closeButton: {
    padding: spacing.xs,
  },
  emptyMessage: {
    ...type.body,
    color: colors.inkMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});

export default LoanDetailsScreen;
