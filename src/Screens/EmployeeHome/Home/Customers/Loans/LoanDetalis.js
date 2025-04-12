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

const LoanDetailsScreen = ({ route, navigation }) => {
  const { loanId } = route.params;
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
        return '#4CAF50';
      case 'AdvancePaid':
        return '#2196F3';
      case 'Overdue':
        return '#F44336';
      case 'Pending':
      case 'PartiallyPaid':
        return '#FF9800';
      default:
        return '#757575';
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
            <TouchableOpacity onPress={() => setPenaltyModalVisible(false)}>
              <Icon name="close" size={24} color="#333" />
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
              <Text style={styles.emptyMessage}>No penalty information available</Text>
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
            <View style={[styles.repaymentStatus, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.repaymentStatusText}>{item.status}</Text>
            </View>
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
            <Icon name="warning" size={16} color="#FFC107" />
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
                color="#666"
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
        <LinearGradient colors={['#f5f7fa', '#e4e7eb']} style={styles.summaryCard}>
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
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Paid</Text>
              <Text style={styles.summaryValue}>{formatCurrency(loanDetails.totalPaid)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Penalty</Text>
              <TouchableOpacity onPress={() => setPenaltyModalVisible(true)}>
                <Text style={[styles.summaryValue, styles.linkText]}>
                  {formatCurrency(loanDetails.totalPenaltyAmount)}{' '}
                  <Icon name="info-outline" size={16} />
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
              value: (
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(loanDetails.status) }]}>
                  <Text style={styles.statusText}>{loanDetails.status}</Text>
                </View>
              ),
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
              <ActivityIndicator size="small" color="#0066cc" />
              <Text style={styles.loaderText}>Loading more...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="receipt-long" size={64} color="#ccc" />
            <Text style={styles.emptyMessage}>No repayment schedules found</Text>
          </View>
        }
      />
    </View>
  );

  const renderCustomerInfo = () => {
    if (!customerProfile) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="person-off" size={64} color="#ccc" />
          <Text style={styles.emptyMessage}>Customer information not available</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <LinearGradient colors={['#f5f7fa', '#e4e7eb']} style={styles.customerCard}>
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
                <Icon name={item.icon} size={20} color="#555" style={styles.customerDetailIcon} />
                <View>
                  <Text style={styles.customerDetailLabel}>{item.label}</Text>
                  <Text style={styles.customerDetailValue}>{item.value || 'N/A'}</Text>
                </View>
              </View>
            ))}

            <View style={styles.customerStatusItem}>
              <Text style={styles.customerStatusLabel}>Account Status</Text>
              <View
                style={[
                  styles.customerStatus,
                  { backgroundColor: customerProfile.accountStatus ? '#4CAF50' : '#F44336' },
                ]}
              >
                <Text style={styles.customerStatusText}>
                  {customerProfile.accountStatus ? 'Active' : 'Inactive'}
                </Text>
              </View>
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
        <ActivityIndicator size="large" color="#0066cc" />
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
              color={activeTab === tab.id ? '#0066cc' : '#666'}
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
          <TouchableOpacity style={styles.retryButton} onPress={fetchLoanDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
    backgroundColor: '#f5f5f5',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#0066cc',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#0066cc',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  linkText: {
    color: '#0066cc',
    fontSize: 16,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 15,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  groupContainer: {
    marginBottom: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    elevation: 2,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  groupDate: {
    fontSize: 14,
    color: '#666',
  },
  groupItems: {
    marginTop: 8,
  },
  repaymentItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
  },
  repaymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  repaymentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repaymentIcon: {
    marginRight: 12,
  },
  repaymentInstallment: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  repaymentDate: {
    fontSize: 14,
    color: '#666',
  },
  repaymentAmount: {
    alignItems: 'flex-end',
  },
  repaymentAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  repaymentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  repaymentStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  paymentDetails: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  paymentDetailsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  paymentItem: {
    marginBottom: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  paymentValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
  },
  penaltyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  penaltyWarningText: {
    color: '#F57C00',
    fontSize: 14,
    marginLeft: 6,
  },
  loaderFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loaderText: {
    marginLeft: 8,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyMessage: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  penaltyItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  penaltyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  penaltyLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  penaltyValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
  },
  penaltyStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  customerCard: {
    borderRadius: 12,
    padding: 20,
    elevation: 3,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  customerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  customerImagePlaceholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInitials: {
    fontSize: 32,
    color: '#666',
    fontWeight: 'bold',
  },
  customerNameContainer: {
    flex: 1,
  },
  customerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  customerUsername: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  customerDetails: {
    marginTop: 8,
  },
  customerDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerDetailIcon: {
    marginRight: 12,
  },
  customerDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  customerDetailValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  customerStatusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  customerStatusLabel: {
    fontSize: 15,
    color: '#666',
  },
  customerStatus: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  customerStatusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 16,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoanDetailsScreen;