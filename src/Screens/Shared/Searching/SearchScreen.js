import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from '../../../components/api/apiUtils';
import { useHomeContext } from '../../../components/context/HomeContext';
import CustomToast from '../../../components/toast/CustomToast';
import { showToast } from '../../../components/toast/CustomToast';
import ProfilePicturePlaceholder from '../../../assets/placeholders/profile.jpg';
import { PieChart } from 'react-native-chart-kit';
import { colors, spacing, radii, type, shadow } from '../../../theme/tokens';
import StatusBadge from '../../../components/ui/StatusBadge';
import EviButton from '../../../components/ui/EviButton';
import EmptyState from '../../../components/ui/EmptyState';

const SearchScreen = () => {
  const { user } = useHomeContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();
  const searchTimeout = useRef(null);

  const fetchSearchResults = async (query, pageNumber) => {
    if (loading || (pageNumber > 1 && !hasMore) || !query.trim()) return;
    setLoading(true);
    try {
      const response = await apiCall('/api/shared/search', 'POST', {
        query,
        page: pageNumber,
        limit: 10,
      });
      if (response.status === 'success') {
        const newResults = response.data.customers || [];
        if (pageNumber === 1) {
          setSearchResults(newResults);
        } else {
          setSearchResults(prev => [...prev, ...newResults]);
        }
        setHasMore(newResults.length === 10);
        setPage(pageNumber);
      } else {
        showToast('error', 'Failed to fetch search results');
      }
    } catch (error) {
      console.error(error);
      showToast('error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    if (text.trim()) {
      searchTimeout.current = setTimeout(() => {
        fetchSearchResults(text, 1);
      }, 300);
    } else {
      setSearchResults([]);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchSearchResults(searchQuery, page + 1);
    }
  };

  const handleCustomerDetails = (item) => {
    setSelectedCustomer(item);
    setModalVisible(true);
  };

  const handleViewProfile = () => {
    setModalVisible(false);
    if (user.role === 'admin') {
      console.log(selectedCustomer.uid);
      navigation.navigate('CustomerView', { uid: selectedCustomer.uid });
    } else if (user.role === 'employee') {
      console.log(selectedCustomer._id);
      navigation.navigate('CustomerView', { id: selectedCustomer._id });
    }
  };

  const renderCustomerItem = ({ item }) => {
    const loan = item.loans && item.loans.length > 0 ? item.loans[0] : null;
    return (
      <TouchableOpacity
        style={styles.customerItem}
        onPress={() => handleCustomerDetails(item)}
      >
        <Image
          source={item.profilePic ? { uri: item.profilePic } : ProfilePicturePlaceholder}
          style={styles.profilePicture}
        />
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name || 'N/A'}</Text>
          <Text style={styles.customerDetail}>
            <Icon name="phone" size={14} color={colors.inkFaint} /> {item.phoneNumber || 'N/A'}
          </Text>
          <Text style={styles.customerDetail}>
            <Icon name="email" size={14} color={colors.inkFaint} /> {item.email || 'N/A'}
          </Text>
          {loan && (
            <View style={styles.loanInfo}>
              <Text style={styles.loanAmount}>
                <Icon name="currency-inr" size={14} color={colors.success} /> {loan.loanAmount || 0}
              </Text>
              <StatusBadge status={loan.status || 'N/A'} />
            </View>
          )}
        </View>
        <Icon name="chevron-right" size={22} color={colors.inkFaint} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.brand} />
      </View>
    );
  };

  const renderLoanDetailsModal = () => {
    if (!selectedCustomer) return null;
    const loan = selectedCustomer.loans && selectedCustomer.loans.length > 0 ? selectedCustomer.loans[0] : null;

    const chartConfig = {
      backgroundGradientFrom: colors.card,
      backgroundGradientTo: colors.card,
      color: (opacity = 1) => `rgba(18, 36, 28, ${opacity})`,
    };

    const screenWidth = Dimensions.get("window").width;

    const pieData = loan ? [
      {
        name: "Paid",
        population: loan.loanAmount - loan.outstandingAmount,
        color: colors.success,
        legendFontColor: colors.inkSoft,
        legendFontSize: 12
      },
      {
        name: "Outstanding",
        population: loan.outstandingAmount,
        color: colors.orange,
        legendFontColor: colors.inkSoft,
        legendFontSize: 12
      }
    ] : [];

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Image
                  source={selectedCustomer.profilePic ? { uri: selectedCustomer.profilePic } : ProfilePicturePlaceholder}
                  style={styles.modalProfilePic}
                />
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>{selectedCustomer.name}</Text>
                  <Text style={styles.modalSubtitle}>{selectedCustomer.email}</Text>
                </View>
              </View>

              {loan ? (
                <>
                  <View style={styles.loanOverview}>
                    <View style={styles.loanOverviewItem}>
                      <Text style={styles.loanOverviewLabel}>Loan Amount</Text>
                      <Text style={styles.loanOverviewValue}>₹{loan.loanAmount}</Text>
                    </View>
                    <View style={styles.loanOverviewItem}>
                      <Text style={styles.loanOverviewLabel}>Outstanding</Text>
                      <Text style={styles.loanOverviewValue}>₹{loan.outstandingAmount}</Text>
                    </View>
                    <View style={styles.loanOverviewItem}>
                      <Text style={styles.loanOverviewLabel}>Status</Text>
                      <StatusBadge status={loan.status} />
                    </View>
                  </View>

                  <View style={styles.chartContainer}>
                    <PieChart
                      data={pieData}
                      width={screenWidth - 60}
                      height={200}
                      chartConfig={chartConfig}
                      accessor={"population"}
                      backgroundColor={"transparent"}
                      paddingLeft={"0"}
                      center={[10, 0]}
                      absolute
                    />
                  </View>

                  <View style={styles.loanDetails}>
                    <View style={styles.loanDetailItem}>
                      <Icon name="calendar-start" size={24} color={colors.brand} />
                      <View style={styles.loanDetailText}>
                        <Text style={styles.loanDetailLabel}>Start Date</Text>
                        <Text style={styles.loanDetailValue}>{new Date(loan.loanStartDate).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Icon name="calendar-end" size={24} color={colors.danger} />
                      <View style={styles.loanDetailText}>
                        <Text style={styles.loanDetailLabel}>End Date</Text>
                        <Text style={styles.loanDetailValue}>{new Date(loan.loanEndDate).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Icon name="file-document-outline" size={24} color={colors.info} />
                      <View style={styles.loanDetailText}>
                        <Text style={styles.loanDetailLabel}>Documents</Text>
                        <Text style={styles.loanDetailValue}>{loan.documentsSummary}</Text>
                      </View>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Icon name="calendar-clock" size={24} color={colors.warning} />
                      <View style={styles.loanDetailText}>
                        <Text style={styles.loanDetailLabel}>Repayment Schedule</Text>
                        <Text style={styles.loanDetailValue}>{loan.repaymentSchedulesSummary}</Text>
                      </View>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Icon name="cash-multiple" size={24} color={colors.success} />
                      <View style={styles.loanDetailText}>
                        <Text style={styles.loanDetailLabel}>Repayments</Text>
                        <Text style={styles.loanDetailValue}>{loan.repaymentsSummary}</Text>
                      </View>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Icon name="alert-circle-outline" size={24} color={colors.orange} />
                      <View style={styles.loanDetailText}>
                        <Text style={styles.loanDetailLabel}>Penalties</Text>
                        <Text style={styles.loanDetailValue}>{loan.penaltiesSummary}</Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <EmptyState
                  icon="file-off-outline"
                  title="No active loans"
                  style={{ marginTop: spacing.xl }}
                />
              )}
            </ScrollView>
            <View style={styles.modalButtonContainer}>
              <EviButton
                title="View Full Profile"
                size="md"
                style={styles.modalButton}
                onPress={handleViewProfile}
              />
              <EviButton
                title="Close"
                variant="secondary"
                size="md"
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={22} color={colors.inkFaint} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, phone, or username"
          value={searchQuery}
          placeholderTextColor={colors.inkFaint}
          onChangeText={handleSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')} style={styles.clearButton}>
            <Icon name="close-circle" size={20} color={colors.inkFaint} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={searchResults}
        renderItem={renderCustomerItem}
        keyExtractor={item => item._id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          searchQuery.trim() ? (
            <EmptyState
              icon="magnify"
              title="No Results Found"
              message="Try a different name, email, or phone number."
              style={{ marginTop: spacing.xxl }}
            />
          ) : (
            <EmptyState
              icon="account-search-outline"
              title="Start Searching"
              message="Enter a name, email, phone, or username above."
              style={{ marginTop: spacing.xxl }}
            />
          )
        }
      />
      {renderLoanDetailsModal()}
      <CustomToast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    margin: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...shadow.card,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: type.sizes.md,
    color: colors.ink,
  },
  clearButton: {
    padding: spacing.xs,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    elevation: 2,
  },
  profilePicture: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: spacing.lg,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: type.sizes.lg,
    fontWeight: type.weights.bold,
    marginBottom: spacing.xs,
    color: colors.ink,
  },
  customerDetail: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    marginBottom: 2,
  },
  loanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  loanAmount: {
    fontSize: type.sizes.sm,
    color: colors.success,
    marginRight: spacing.md,
  },
  chevron: {
    marginLeft: spacing.sm,
  },
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 31, 22, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.xl,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
    ...shadow.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalProfilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: spacing.lg,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: type.sizes.xxl,
    fontWeight: type.weights.bold,
    color: colors.ink,
  },
  modalSubtitle: {
    fontSize: type.sizes.md,
    color: colors.inkSoft,
  },
  loanOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  loanOverviewItem: {
    alignItems: 'center',
  },
  loanOverviewLabel: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    marginBottom: spacing.xs,
  },
  loanOverviewValue: {
    fontSize: type.sizes.lg,
    fontWeight: type.weights.bold,
    color: colors.ink,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  loanDetails: {
    marginTop: spacing.xl,
  },
  loanDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  loanDetailText: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  loanDetailLabel: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
  },
  loanDetailValue: {
    fontSize: type.sizes.md,
    color: colors.ink,
    fontWeight: type.weights.bold,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
});

export default SearchScreen;
