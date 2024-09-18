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
import Toast from 'react-native-toast-message';
import ProfilePicturePlaceholder from '../../../assets/placeholders/profile.jpg';
import { PieChart } from 'react-native-chart-kit';

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
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch search results',
        });
      }
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred',
      });
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
            <Icon name="phone" size={14} color="#666" /> {item.phoneNumber || 'N/A'}
          </Text>
          <Text style={styles.customerDetail}>
            <Icon name="email" size={14} color="#666" /> {item.email || 'N/A'}
          </Text>
          {loan && (
            <View style={styles.loanInfo}>
              <Text style={styles.loanAmount}>
                <Icon name="currency-inr" size={14} color="#4CAF50" /> {loan.loanAmount || 0}
              </Text>
              <View style={[styles.loanStatus, { backgroundColor: getLoanStatusColor(loan.status) }]}>
                <Text style={styles.loanStatusText}>{loan.status || 'N/A'}</Text>
              </View>
            </View>
          )}
        </View>
        <Icon name="chevron-right" size={24} color="#999" style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  const getLoanStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return '#4CAF50';
      case 'pending': return '#FFC107';
      case 'completed': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    );
  };

  const renderLoanDetailsModal = () => {
    if (!selectedCustomer) return null;
    const loan = selectedCustomer.loans && selectedCustomer.loans.length > 0 ? selectedCustomer.loans[0] : null;

    const chartConfig = {
      backgroundGradientFrom: "#fff",
      backgroundGradientTo: "#fff",
      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    };

    const screenWidth = Dimensions.get("window").width;

    const pieData = loan ? [
      {
        name: "Paid",
        population: loan.loanAmount - loan.outstandingAmount,
        color: "#4CAF50",
        legendFontColor: "#7F7F7F",
        legendFontSize: 12
      },
      {
        name: "Outstanding",
        population: loan.outstandingAmount,
        color: "#FFA000",
        legendFontColor: "#7F7F7F",
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
                      <View style={[styles.loanStatus, { backgroundColor: getLoanStatusColor(loan.status) }]}>
                        <Text style={styles.loanStatusText}>{loan.status}</Text>
                      </View>
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
                      <Icon name="calendar-start" size={24} color="#4CAF50" />
                      <View style={styles.loanDetailText}>
                        <Text style={styles.loanDetailLabel}>Start Date</Text>
                        <Text style={styles.loanDetailValue}>{new Date(loan.loanStartDate).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Icon name="calendar-end" size={24} color="#F44336" />
                      <View style={styles.loanDetailText}>
                        <Text style={styles.loanDetailLabel}>End Date</Text>
                        <Text style={styles.loanDetailValue}>{new Date(loan.loanEndDate).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Icon name="file-document-outline" size={24} color="#2196F3" />
                      <View style={styles.loanDetailText}>
                        <Text style={styles.loanDetailLabel}>Documents</Text>
                        <Text style={styles.loanDetailValue}>{loan.documentsSummary}</Text>
                      </View>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Icon name="calendar-clock" size={24} color="#9C27B0" />
                      <View style={styles.loanDetailText}>
                        <Text style={styles.loanDetailLabel}>Repayment Schedule</Text>
                        <Text style={styles.loanDetailValue}>{loan.repaymentSchedulesSummary}</Text>
                      </View>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Icon name="cash-multiple" size={24} color="#009688" />
                      <View style={styles.loanDetailText}>
                        <Text style={styles.loanDetailLabel}>Repayments</Text>
                        <Text style={styles.loanDetailValue}>{loan.repaymentsSummary}</Text>
                      </View>
                    </View>
                    <View style={styles.loanDetailItem}>
                      <Icon name="alert-circle-outline" size={24} color="#FF5722" />
                      <View style={styles.loanDetailText}>
                        <Text style={styles.loanDetailLabel}>Penalties</Text>
                        <Text style={styles.loanDetailValue}>{loan.penaltiesSummary}</Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <Text style={styles.noLoanText}>No active loans</Text>
              )}
            </ScrollView>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.modalButton} onPress={handleViewProfile}>
                <Text style={styles.modalButtonText}>View Full Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalCloseButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={24} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, phone, or username"
          value={searchQuery}
          placeholderTextColor={'#999'}
          onChangeText={handleSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')} style={styles.clearButton}>
            <Icon name="close-circle" size={20} color="#999" />
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
          <Text style={styles.emptyText}>
            {searchQuery.trim() ? 'No results found' : 'Enter search criteria'}
          </Text>
        }
      />
      {renderLoanDetailsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    margin: 16,
    paddingHorizontal: 16,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
  },
  profilePicture: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  customerDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  loanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  loanAmount: {
    fontSize: 14,
    color: '#4CAF50',
    marginRight: 12,
  },
  loanStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  loanStatusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  chevron: {
    marginLeft: 8,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalProfilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  loanOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  loanOverviewItem: {
    alignItems: 'center',
  },
  loanOverviewLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  loanOverviewValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loanStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  loanStatusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loanDetails: {
    marginTop: 20,
  },
  loanDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loanDetailText: {
    marginLeft: 16,
    flex: 1,
  },
  loanDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  loanDetailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  noLoanText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalCloseButton: {
    backgroundColor: '#F44336',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SearchScreen;