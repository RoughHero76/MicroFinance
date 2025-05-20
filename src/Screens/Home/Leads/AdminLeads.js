import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  SafeAreaView,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from '../../../components/api/apiUtils';
import CustomToast, { showToast } from '../../../components/toast/CustomToast';
import { useHomeContext } from '../../../components/context/HomeContext';

const AdminLeadsScreen = ({ navigation }) => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    approved: 0,
    rejected: 0,
    converted: 0
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    limit: 10
  });
  const [filters, setFilters] = useState({
    status: '',
    followupStatus: '',
    search: '',
    assignedTo: '',
    sortBy: 'date',
    sortOrder: -1
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const { employees } = useHomeContext();

  const statusOptions = ['Pending', 'InProgress', 'Approved', 'Rejected', 'Converted'];
  const followupOptions = ['Pending', 'Completed'];

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.currentPage,
        limit: pagination.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      if (filters.status) queryParams.append('status', filters.status);
      if (filters.followupStatus) queryParams.append('followupStatus', filters.followupStatus);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.assignedTo) queryParams.append('assignedTo', filters.assignedTo);

      const response = await apiCall(`/api/admin/lead?${queryParams.toString()}`);

      if (!response.error) {
        setLeads(response.data.leads);
        setFilteredLeads(response.data.leads);
        setStats(response.data.stats);
        setPagination(response.pagination);
      } else {
        showToast('error', 'Error', response.message);
      }
    } catch (error) {
      showToast('error', 'Error', 'Failed to fetch leads');
      console.error('Fetch leads error:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.currentPage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeads().finally(() => setRefreshing(false));
  }, [fetchLeads]);

  useFocusEffect(
    useCallback(() => {
      fetchLeads();
      return () => { };
    }, [fetchLeads])
  );

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const assignEmployee = async (employeeId) => {
    if (!selectedLead) return;

    try {
      const response = await apiCall(
        `/api/admin/lead/${selectedLead._id}/assign`,
        'POST',
        { employeeId }
      );

      if (!response.error) {
        showToast('success', 'Success', 'Lead assigned successfully');
        setModalVisible(false);
        fetchLeads();
      } else {
        showToast('error', 'Error', response.message);
      }
    } catch (error) {
      showToast('error', 'Error', 'Failed to assign lead');
      console.error('Assign employee error:', error);
    }
  };

  const updateLeadCheck = async (status) => {
    setSelectedStatus(status); // Track the selected status
    Alert.alert(
      'Confirm Lead Update',
      `Are you sure you want to update this lead to ${status}?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setSelectedStatus(null) }, // Reset on cancel
        { text: 'OK', onPress: () => updateLeadStatus(status) },
      ]
    );
  };

  const updateLeadStatus = async (status) => {
    if (!selectedLead) return;

    try {
      if ((status === 'Approved' || status === 'Rejected') && !adminRemarks.trim()) {
        showToast('error', 'Error', 'Remarks are required for Approve/Reject');
        return;
      }

      const payload = { status };
      if (adminRemarks.trim()) {
        payload.remarksByAdmin = adminRemarks;
      }

      const response = await apiCall(
        `/api/admin/lead/${selectedLead._id}/status`,
        'PATCH',
        payload
      );

      if (!response.error) {
        showToast('success', 'Success', `Lead status updated to ${status}`);
        setStatusModalVisible(false);
        setAdminRemarks('');
        setSelectedStatus(null); // Reset selected status
        fetchLeads();
      } else {
        showToast('error', 'Error', response.message);
      }
    } catch (error) {
      showToast('error', 'Error', 'Failed to update lead status');
      console.error('Update status error:', error);
    }
  };
  const handleDeleteLead = (leadId) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this lead?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: () => deleteLead(leadId) }
    ]);
  };

  const deleteLead = async (leadId) => {
    try {
      const response = await apiCall(`/api/admin/lead/${leadId}`, 'DELETE');

      if (!response.error) {
        showToast('success', 'Success', 'Lead deleted successfully');
        fetchLeads();
      } else {
        showToast('error', 'Error', response.message);
      }
    } catch (error) {
      showToast('error', 'Error', 'Failed to delete lead');
      console.error('Delete lead error:', error);
    }
  };

  const renderLeadCard = ({ item }) => (
    <View style={styles.leadCard}>
      <View style={styles.leadHeader}>
        <View style={styles.leadNameContainer}>
          {item.pictureUrl ? (
            <Image
              source={{ uri: item.pictureUrl }}
              style={styles.leadAvatar}
              defaultSource={require('../../../assets/placeholders/profile.jpg')}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{item.name ? item.name[0].toUpperCase() : '?'}</Text>
            </View>
          )}
          <View style={styles.leadInfo}>
            <Text style={styles.leadName}>{item.name || 'Unknown'}</Text>
            <Text style={styles.leadContact}>{item.phone || 'No phone'}</Text>
            <Text style={styles.leadContact}>{item.email || 'No email'}</Text>
          </View>
        </View>
        <View style={styles.leadStatusContainer}>
          <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
            <Text style={styles.leadDetailLabel}>Status</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', marginBottom: 4, marginTop: 12 }}>
            <Text style={styles.leadDetailLabel}>Follow Up</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.followupStatus) }]}>
            <Text style={styles.statusText}>{item.followupStatus || 'N/A'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.leadDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.leadDetailLabel}>Loan Type</Text>
            <Text style={styles.leadDetail}>{item.loanType || 'N/A'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.leadDetailLabel}>Amount</Text>
            <Text style={styles.leadDetail}>{item.loanAmount?.toLocaleString() || 'N/A'}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.leadDetailLabel}>Duration</Text>
            <Text style={styles.leadDetail}>{item.loanDuration || 'N/A'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.leadDetailLabel}>City</Text>
            <Text style={styles.leadDetail}>{item.city || 'N/A'}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.leadDetailLabel}>Assigned To</Text>
            <Text style={styles.leadDetail}>
              {item.AssignedTo ? `${item.AssignedTo.fname} ${item.AssignedTo.lname}` : 'Unassigned'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.leadDetailLabel}>Added By</Text>
            <Text style={styles.leadDetail}>
              {item.addedBy ? `${item.addedBy.fname} ${item.addedBy.lname}` : 'N/A'}
            </Text>
          </View>



        </View>
        <View>
          <Text style={styles.leadDetailLabel}>Remarks</Text>
          <Text style={styles.leadDetail}>{item.remarksEmployee || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.leadActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setSelectedLead(item);
            setModalVisible(true);
          }}
        >
          <Icon name="account-arrow-right" size={18} color="#43A047" />
          <Text style={styles.actionText}>Assign</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setSelectedLead(item);
            setStatusModalVisible(true);
          }}
        >
          <Icon name="clipboard-check" size={18} color="#FF9800" />
          <Text style={styles.actionText}>Status</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteLead(item._id)}
        >
          <Icon name="delete" size={18} color="#F44336" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStatusColor = (status) => {
    const colors = {
      Pending: '#FFB300',
      InProgress: '#8E24AA',
      Approved: '#4CAF50',
      Rejected: '#F44336',
      Converted: '#00BCD4'
    };
    return colors[status] || '#E3F2FD';
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="file-search-outline" size={64} color="#90A4AE" />
      <Text style={styles.emptyText}>No Leads Available</Text>
      <Text style={styles.emptySubtext}>Try adjusting filters or create a new lead</Text>
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={filterModalVisible}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filter Options</Text>

          <Text style={styles.filterLabel}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterButton, !filters.status && styles.filterButtonActive]}
              onPress={() => handleFilterChange('status', '')}
            >
              <Text style={styles.filterButtonText}>All</Text>
            </TouchableOpacity>
            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterButton, filters.status === status && styles.filterButtonActive]}
                onPress={() => handleFilterChange('status', status)}
              >
                <Text style={styles.filterButtonText}>{status}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Follow-up Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterButton, !filters.followupStatus && styles.filterButtonActive]}
              onPress={() => handleFilterChange('followupStatus', '')}
            >
              <Text style={styles.filterButtonText}>All</Text>
            </TouchableOpacity>
            {followupOptions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterButton, filters.followupStatus === status && styles.filterButtonActive]}
                onPress={() => handleFilterChange('followupStatus', status)}
              >
                <Text style={styles.filterButtonText}>{status}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Assigned To</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterButton, !filters.assignedTo && styles.filterButtonActive]}
              onPress={() => handleFilterChange('assignedTo', '')}
            >
              <Text style={styles.filterButtonText}>All</Text>
            </TouchableOpacity>
            {employees?.map((employee) => (
              <TouchableOpacity
                key={employee._id}
                style={[styles.filterButton, filters.assignedTo === employee._id && styles.filterButtonActive]}
                onPress={() => handleFilterChange('assignedTo', employee._id)}
              >
                <Text style={styles.filterButtonText}>{employee.fname} {employee.lname}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setStatusModalVisible(false);
              setAdminRemarks('');
              setSelectedStatus(null); // Reset selected status
            }}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads..."
            value={filters.search}
            onChangeText={(text) => handleFilterChange('search', text)}
            returnKeyType="search"
            onSubmitEditing={fetchLeads}
          />
          <TouchableOpacity style={styles.searchButton} onPress={fetchLeads}>
            <Icon name="magnify" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Icon name="filter" size={20} color="#FFFFFF" />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {loading && leads.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={styles.loadingText}>Loading leads...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLeads}
          renderItem={renderLeadCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.leadsList}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#1E88E5"]}
            />
          }
        />
      )}

      {pagination.totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              pagination.currentPage === 1 && styles.paginationButtonDisabled
            ]}
            onPress={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
          >
            <Icon name="chevron-left" size={24} color={pagination.currentPage === 1 ? "#BDBDBD" : "#1E88E5"} />
          </TouchableOpacity>
          <Text style={styles.paginationText}>
            Page {pagination.currentPage} of {pagination.totalPages}
          </Text>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              pagination.currentPage === pagination.totalPages && styles.paginationButtonDisabled
            ]}
            onPress={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
          >
            <Icon name="chevron-right" size={24} color={pagination.currentPage === pagination.totalPages ? "#BDBDBD" : "#1E88E5"} />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Employee</Text>
            <ScrollView style={styles.employeeList}>
              {employees?.map((employee) => (
                <TouchableOpacity
                  key={employee._id}
                  style={styles.employeeItem}
                  onPress={() => assignEmployee(employee._id)}
                >
                  <Text style={styles.employeeName}>
                    {employee.fname} {employee.lname}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={statusModalVisible}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Lead Status</Text>
            <View style={styles.statusButtonsContainer}>
              {statusOptions.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusButton,
                    { backgroundColor: getStatusColor(status) },
                    selectedStatus === status && styles.statusButtonSelected, // Apply selected style
                  ]}
                  onPress={() => updateLeadCheck(status)}
                >
                  <Text style={styles.statusButtonText}>{status}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.remarksInput}
              placeholder="Admin remarks (required for Approve/Reject)"
              value={adminRemarks}
              onChangeText={setAdminRemarks}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setStatusModalVisible(false);
                setAdminRemarks('');
              }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {renderFilterModal()}
      <CustomToast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 14,
    marginRight: 12,
  },
  searchButton: {
    backgroundColor: '#1E88E5',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButton: {
    backgroundColor: '#1E88E5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    marginLeft: 12,
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  leadsList: {
    padding: 16,
    paddingBottom: 100,
  },
  leadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  leadNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  leadAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    color: '#64748B',
    fontSize: 24,
    fontWeight: '700',
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  leadContact: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  leadDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
    marginRight: 12,
  },
  leadDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  leadDetail: {
    fontSize: 14,
    color: '#1E293B',
  },
  leadActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  paginationButton: {
    padding: 8,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  employeeList: {
    maxHeight: 320,
  },
  employeeItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  employeeName: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#1E88E5',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusButton: {
    width: '48%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
  },
  statusButtonSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 5, // Add shadow for Android
    shadowColor: '#000', // Add shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  remarksInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    marginBottom: 12,
    fontSize: 14,
  },
  filterScroll: {
    marginBottom: 20,
  },
  filterButtonActive: {
    backgroundColor: 'green',
  },

  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1E293B',
  },
});

export default AdminLeadsScreen;