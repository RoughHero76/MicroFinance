import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  FlatList,
  Image,
} from 'react-native';
import { apiCall } from '../../../../../components/api/apiUtils';
import { format } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { debounce } from 'lodash';
import { colors, spacing, radii, type, shadow } from '../../../../../theme/tokens';
import StatusBadge from '../../../../../components/ui/StatusBadge';
import EmptyState from '../../../../../components/ui/EmptyState';
import EviButton from '../../../../../components/ui/EviButton';

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

  useEffect(() => {
    fetchLoanDetails();
  }, [currentPage]);

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

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'Active':
      case 'Paid':
      case 'PartiallyPaidFullyPaid':
      case 'OverduePaid':
      case 'Waived':
        return colors.success;
      case 'AdvancePaid':
        return colors.info;
      case 'Overdue':
        return colors.danger;
      case 'Pending':
      case 'PartiallyPaid':
        return colors.orange;
      default:
        return colors.inkSoft;
    }
  }, []);

  const getRepaymentStatusIcon = useCallback((status) => {
    switch (status) {
      case 'Paid':
      case 'PartiallyPaidFullyPaid':
      case 'OverduePaid':
      case 'Waived':
        return 'check-circle';
      case 'AdvancePaid':
        return 'schedule';
      case 'Overdue':
        return 'error';
      case 'Pending':
      case 'PartiallyPaid':
        return 'hourglass-empty';
      default:
        return 'help';
    }
  }, []);

  const PenaltyItem = memo(({ item, formatDate, formatCurrency, getStatusColor }) => (
    <View style={styles.penaltyItem}>
      <View style={styles.penaltyRow}>
        <Text style={styles.penaltyLabel}>Date:</Text>
        <Text style={styles.penaltyValue}>{formatDate(item.appliedDate)}</Text>
      </View>
      <View style={styles.penaltyRow}>
        <Text style={styles.penaltyLabel}>Amount:</Text>
        <Text style={styles.penaltyValue}>{formatCurrency(item.amount)}</Text>
      </View>
      <View style={styles.penaltyRow}>
        <Text style={styles.penaltyLabel}>Reason:</Text>
        <Text style={styles.penaltyValue}>{item.reason || 'N/A'}</Text>
      </View>
      <View style={styles.penaltyRow}>
        <Text style={styles.penaltyLabel}>Status:</Text>
        <Text style={[styles.penaltyStatus, { color: getStatusColor(item.status) }]}>
          {item.status}
        </Text>
      </View>
    </View>
  ));

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
              style={styles.closeChip}
              onPress={() => setPenaltyModalVisible(false)}
            >
              <Icon name="close" size={20} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={loanDetails?.totalPenalty || []}
            keyExtractor={(item, index) => `${item._id}-${index}`}
            renderItem={({ item }) => (
              <PenaltyItem
                item={item}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
                getStatusColor={getStatusColor}
              />
            )}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            ListEmptyComponent={
              <EmptyState
                icon="alert-circle-outline"
                title="No Penalty Information"
                message="No penalty information available."
                style={{ marginTop: spacing.xl }}
              />
            }
          />
        </View>
      </View>
    </Modal>
  );

  const RepaymentItem = memo(
    ({ item, formatDate, formatCurrency, getStatusColor, getRepaymentStatusIcon }) => (
      <View style={styles.repaymentItem}>
        <View style={styles.repaymentHeader}>
          <View style={styles.repaymentHeaderLeft}>
            <Icon
              name={getRepaymentStatusIcon(item.status)}
              size={24}
              color={getStatusColor(item.status)}
              style={styles.repaymentIcon}
            />
            <View>
              <Text style={styles.repaymentInstallment}>
                Installment #{item.loanInstallmentNumber}
              </Text>
              <Text style={styles.repaymentDate}>Due: {formatDate(item.dueDate)}</Text>
            </View>
          </View>
          <View style={styles.repaymentAmount}>
            <Text style={styles.repaymentAmountText}>{formatCurrency(item.amount)}</Text>
            <StatusBadge status={item.status} style={{ marginTop: spacing.xs }} />
          </View>
        </View>

        {item.repayments?.length > 0 && (
          <View style={styles.paymentDetails}>
            <Text style={styles.paymentDetailsTitle}>Payment Details</Text>
            {item.repayments.map((payment, index) => (
              <View key={`${payment._id}-${index}`} style={styles.paymentItem}>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Date:</Text>
                  <Text style={styles.paymentValue}>{formatDate(payment.paymentDate)}</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Amount:</Text>
                  <Text style={styles.paymentValue}>{formatCurrency(payment.amount)}</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Method:</Text>
                  <Text style={styles.paymentValue}>{payment.paymentMethod || 'N/A'}</Text>
                </View>
                {payment.transactionId && (
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Transaction ID:</Text>
                    <Text style={styles.paymentValue}>{payment.transactionId}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {item.penaltyApplied && (
          <View style={styles.penaltyWarning}>
            <Icon name="warning" size={16} color={colors.warning} />
            <Text style={styles.penaltyWarningText}>Penalty Applied</Text>
          </View>
        )}
      </View>
    )
  );

  const GroupedRepaymentItem = memo(
    ({ group, index, formatDate, formatCurrency, getStatusColor, getRepaymentStatusIcon }) => {
      const isExpanded = expandedGroups[index];
      const showRange = group.count > 1;

      return (
        <View style={styles.groupContainer}>
          {showRange && (
            <TouchableOpacity
              style={styles.groupHeader}
              onPress={() => toggleGroupExpansion(index)}
            >
              <View style={styles.groupHeaderLeft}>
                <Icon
                  name={getRepaymentStatusIcon(group.status)}
                  size={24}
                  color={getStatusColor(group.status)}
                />
                <View>
                  <Text style={styles.groupTitle}>
                    {group.status} ({group.count} installments)
                  </Text>
                  <Text style={styles.groupDate}>
                    From {formatDate(group.startItem.dueDate)} to{' '}
                    {formatDate(group.endItem.dueDate)}
                  </Text>
                </View>
              </View>
              <Icon
                name={isExpanded ? 'expand-less' : 'expand-more'}
                size={24}
                color={colors.inkSoft}
              />
            </TouchableOpacity>
          )}

          {(isExpanded || !showRange) && (
            <View style={styles.groupItems}>
              {group.indices.map((itemIndex) => (
                <RepaymentItem
                  key={`${repaymentSchedules[itemIndex]._id}-${itemIndex}`}
                  item={repaymentSchedules[itemIndex]}
                  formatDate={formatDate}
                  formatCurrency={formatCurrency}
                  getStatusColor={getStatusColor}
                  getRepaymentStatusIcon={getRepaymentStatusIcon}
                />
              ))}
            </View>
          )}
        </View>
      );
    }
  );

  const renderLoanDetails = () => {
    if (!loanDetails) return null;

    return (
      <View style={styles.tabContent}>
        <LinearGradient
          colors={['#ffffff', colors.brand + '14']}
          style={styles.summaryCard}
        >
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Loan</Text>
              <Text style={styles.summaryValue}>{formatCurrency(loanDetails.loanAmount)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Outstanding</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(loanDetails.outstandingAmount)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRowLast}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Paid</Text>
              <Text style={styles.summaryValue}>{formatCurrency(loanDetails.totalPaid)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Penalty</Text>
              <TouchableOpacity onPress={() => setPenaltyModalVisible(true)}>
                <Text style={[styles.summaryValue, styles.linkText]}>
                  {formatCurrency(loanDetails.totalPenaltyAmount)}{' '}
                  <Icon name="info-outline" size={16} color={colors.brand} />
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Loan Information</Text>
          {[
            { label: 'Loan Number', value: loanDetails.loanNumber },
            { label: 'Loan Type', value: loanDetails.loanType },
            {
              label: 'Status',
              value: <StatusBadge status={loanDetails.status} />,
            },
            { label: 'Principal Amount', value: formatCurrency(loanDetails.principalAmount) },
            { label: 'Interest Rate', value: `${loanDetails.interestRate}%` },
          ].map((item, index) => (
            <View key={index} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              {typeof item.value === 'string' ? (
                <Text style={styles.detailValue}>{item.value}</Text>
              ) : (
                item.value
              )}
            </View>
          ))}

          <Text style={styles.sectionTitle}>Repayment Terms</Text>
          {[
            { label: 'Duration', value: loanDetails.loanDuration },
            { label: 'Start Date', value: formatDate(loanDetails.loanStartDate) },
            { label: 'End Date', value: formatDate(loanDetails.loanEndDate) },
            { label: 'Installments', value: loanDetails.numberOfInstallments },
            { label: 'Frequency', value: loanDetails.installmentFrequency },
            {
              label: 'Per Installment',
              value: formatCurrency(loanDetails.repaymentAmountPerInstallment),
            },
          ].map((item, index) => (
            <View key={index} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailValue}>{item.value}</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Business Information</Text>
          {[
            { label: 'Business Name', value: loanDetails.businessFirmName },
            { label: 'Address', value: loanDetails.businessAddress },
            { label: 'Phone', value: loanDetails.businessPhone },
            { label: 'Email', value: loanDetails.businessEmail },
          ].map((item, index) => (
            <View key={index} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailValue}>{item.value || 'N/A'}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderRepaymentHistory = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={groupedRepayments}
        keyExtractor={(group, index) => `group-${index}`}
        renderItem={({ item, index }) => (
          <GroupedRepaymentItem
            group={item}
            index={index}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            getStatusColor={getStatusColor}
            getRepaymentStatusIcon={getRepaymentStatusIcon}
          />
        )}
        onEndReached={loadMoreRepayments}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListFooterComponent={
          loading && hasMoreRepayments ? (
            <View style={styles.loaderFooter}>
              <ActivityIndicator size="small" color={colors.brand} />
              <Text style={styles.loaderText}>Loading more...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No Repayment Schedules"
            message="No repayment schedules found yet."
            style={{ marginTop: spacing.xxl }}
          />
        }
      />
    </View>
  );

  const renderCustomerInfo = () => {
    if (!customerProfile) {
      return (
        <EmptyState
          icon="account-off-outline"
          title="Customer Not Found"
          message="Customer information not available."
          style={{ marginTop: spacing.xxl }}
        />
      );
    }

    return (
      <View style={styles.tabContent}>
        <LinearGradient
          colors={['#ffffff', colors.brand + '14']}
          style={styles.customerCard}
        >
          <View style={styles.customerHeader}>
            {customerProfile.profilePic ? (
              <Image source={{ uri: customerProfile.profilePic }} style={styles.customerImage} />
            ) : (
              <View style={[styles.customerImage, styles.customerImagePlaceholder]}>
                <Text style={styles.customerInitials}>
                  {customerProfile.fname?.charAt(0)}
                  {customerProfile.lname?.charAt(0)}
                </Text>
              </View>
            )}
            <View style={styles.customerNameContainer}>
              <Text style={styles.customerName}>
                {customerProfile.fname} {customerProfile.lname}
              </Text>
              <Text style={styles.customerUsername}>@{customerProfile.userName}</Text>
            </View>
          </View>

          <View style={styles.customerDetails}>
            {[
              {
                icon: 'phone',
                label: 'Phone Number',
                value: customerProfile.phoneNumber,
              },
              { icon: 'email', label: 'Email', value: customerProfile.email },
              {
                icon: 'location-on',
                label: 'Address',
                value: `${customerProfile.address}, ${customerProfile.city}, ${customerProfile.state} - ${customerProfile.pincode}`,
              },
              { icon: 'flag', label: 'Country', value: customerProfile.country },
              {
                icon: 'account-balance',
                label: 'Total Loans',
                value: customerProfile.loans?.length || 0,
              },
            ].map((item, index) => (
              <View key={index} style={styles.customerDetailItem}>
                <Icon name={item.icon} size={20} color={colors.inkSoft} style={styles.customerDetailIcon} />
                <View>
                  <Text style={styles.customerDetailLabel}>{item.label}</Text>
                  <Text style={styles.customerDetailValue}>{item.value || 'N/A'}</Text>
                </View>
              </View>
            ))}

            <View style={styles.customerStatusItem}>
              <Text style={styles.customerStatusLabel}>Account Status</Text>
              <StatusBadge
                status={customerProfile.accountStatus ? 'Active' : 'Inactive'}
              />
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return renderLoanDetails();
      case 'customer':
        return renderCustomerInfo();
      default:
        return null;
    }
  };

  if (loading && !loanDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loadingText}>Loading loan details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabBar}>
        {[
          { id: 'details', icon: 'assessment', label: 'Details' },
          { id: 'repayments', icon: 'receipt-long', label: 'Repayments' },
          { id: 'customer', icon: 'person', label: 'Customer' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Icon
              name={tab.icon}
              size={22}
              color={activeTab === tab.id ? colors.brand : colors.inkSoft}
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <EviButton
            title="Retry"
            variant="secondary"
            size="md"
            icon="refresh"
            style={{ marginTop: spacing.sm }}
            onPress={fetchLoanDetails}
          />
        </View>
      )}

      {activeTab === 'repayments' ? (
        renderRepaymentHistory()
      ) : (
        <ScrollView style={styles.content}>
          {renderTabContent()}
        </ScrollView>
      )}

      {renderPenaltyModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    elevation: 4,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: colors.brand,
  },
  tabText: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    marginLeft: 6,
  },
  activeTabText: {
    color: colors.brand,
    fontWeight: type.weights.semibold,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: spacing.lg,
  },
  summaryCard: {
    borderRadius: radii.md,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  summaryRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: type.sizes.xl,
    fontWeight: type.weights.bold,
    color: colors.ink,
  },
  linkText: {
    color: colors.brand,
    fontSize: type.sizes.lg,
  },
  detailsContainer: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.xl,
    ...shadow.card,
  },
  sectionTitle: {
    fontSize: type.sizes.xl,
    fontWeight: type.weights.bold,
    color: colors.ink,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontSize: type.sizes.md,
    color: colors.inkSoft,
    flex: 1,
  },
  detailValue: {
    fontSize: type.sizes.md,
    color: colors.ink,
    fontWeight: type.weights.medium,
    flex: 1,
    textAlign: 'right',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.inkSoft,
    fontSize: type.sizes.lg,
  },
  groupContainer: {
    marginBottom: spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.lg,
    ...shadow.card,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupTitle: {
    fontSize: type.sizes.lg,
    fontWeight: type.weights.bold,
    color: colors.ink,
  },
  groupDate: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
  },
  groupItems: {
    marginTop: spacing.sm,
  },
  repaymentItem: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  repaymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  repaymentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repaymentIcon: {
    marginRight: spacing.md,
  },
  repaymentInstallment: {
    fontSize: type.sizes.lg,
    fontWeight: type.weights.bold,
    color: colors.ink,
  },
  repaymentDate: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
  },
  repaymentAmount: {
    alignItems: 'flex-end',
  },
  repaymentAmountText: {
    fontSize: type.sizes.lg,
    fontWeight: type.weights.bold,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  paymentDetails: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  paymentDetailsTitle: {
    fontSize: type.sizes.md,
    fontWeight: type.weights.semibold,
    color: colors.ink,
    marginBottom: spacing.sm + 2,
  },
  paymentItem: {
    marginBottom: spacing.sm + 2,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentLabel: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    flex: 1,
  },
  paymentValue: {
    fontSize: type.sizes.sm,
    color: colors.ink,
    flex: 2,
  },
  penaltyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningTint,
    padding: 10,
    borderRadius: radii.sm,
    marginTop: spacing.sm,
  },
  penaltyWarningText: {
    color: colors.warning,
    fontSize: type.sizes.sm,
    marginLeft: 6,
    fontWeight: type.weights.medium,
  },
  loaderFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loaderText: {
    marginLeft: spacing.sm,
    color: colors.inkSoft,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 31, 22, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    width: '90%',
    maxHeight: '80%',
    borderRadius: radii.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    ...shadow.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: type.sizes.xl,
    fontWeight: type.weights.bold,
    color: colors.ink,
  },
  closeChip: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  penaltyItem: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
  },
  penaltyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  penaltyLabel: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    flex: 1,
  },
  penaltyValue: {
    fontSize: type.sizes.sm,
    color: colors.ink,
    flex: 2,
  },
  penaltyStatus: {
    fontSize: type.sizes.sm,
    fontWeight: type.weights.medium,
  },
  customerCard: {
    borderRadius: radii.md,
    padding: spacing.xl,
    ...shadow.card,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  customerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: spacing.lg,
  },
  customerImagePlaceholder: {
    backgroundColor: colors.brandTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInitials: {
    fontSize: type.sizes.display,
    color: colors.brand,
    fontWeight: type.weights.bold,
  },
  customerNameContainer: {
    flex: 1,
  },
  customerName: {
    fontSize: type.sizes.xl,
    fontWeight: type.weights.bold,
    color: colors.ink,
  },
  customerUsername: {
    fontSize: type.sizes.lg,
    color: colors.inkSoft,
    marginTop: 4,
  },
  customerDetails: {
    marginTop: spacing.sm,
  },
  customerDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  customerDetailIcon: {
    marginRight: spacing.md,
  },
  customerDetailLabel: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
  },
  customerDetailValue: {
    fontSize: type.sizes.md,
    color: colors.ink,
    fontWeight: type.weights.medium,
  },
  customerStatusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  customerStatusLabel: {
    fontSize: type.sizes.md,
    color: colors.inkSoft,
  },
  errorContainer: {
    padding: spacing.lg,
    backgroundColor: colors.dangerTint,
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: type.sizes.lg,
    marginBottom: spacing.sm,
  },
});

export default LoanDetailsScreen;
