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
import { colors, spacing, type, radii, shadow } from '../../../theme/tokens';
import StatusBadge from '../../../components/ui/StatusBadge';
import EmptyState from '../../../components/ui/EmptyState';
import EviButton from '../../../components/ui/EviButton';

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
          <View style={{ alignItems: 'flex-end', marginBottom: spacing.xs }}>
            <Text style={styles.leadDetailLabel}>Status</Text>
          </View>
          <StatusBadge status={item.status || 'Unknown'} />
          <View style={{ alignItems: 'flex-end', marginBottom: spacing.xs, marginTop: spacing.md }}>
            <Text style={styles.leadDetailLabel}>Follow Up</Text>
          </View>
          <StatusBadge status={item.followupStatus || 'N/A'} />
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
          <Icon name="account-arrow-right" size={18} color={colors.success} />
          <Text style={styles.actionText}>Assign</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setSelectedLead(item);
            setStatusModalVisible(true);
          }}
        >
          <Icon name="clipboard-check" size={18} color={colors.warning} />
          <Text style={styles.actionText}>Status</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteLead(item._id)}
        >
          <Icon name="delete" size={18} color={colors.danger} />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStatusColor = (status) => {
    const colorMap = {
      Pending: colors.warning,
      InProgress: colors.info,
      Approved: colors.success,
      Rejected: colors.danger,
      Converted: colors.brand
    };
    return colorMap[status] || colors.inkFaint;
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <EmptyState
        icon="file-search-outline"
        title="No Leads Available"
        message="Try adjusting filters or create a new lead"
      />
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
              <Text style={[styles.filterButtonText, !filters.status && styles.filterButtonTextActive]}>All</Text>
            </TouchableOpacity>
            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterButton, filters.status === status && styles.filterButtonActive]}
                onPress={() => handleFilterChange('status', status)}
              >
                <Text style={[styles.filterButtonText, filters.status === status && styles.filterButtonTextActive]}>{status}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Follow-up Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterButton, !filters.followupStatus && styles.filterButtonActive]}
              onPress={() => handleFilterChange('followupStatus', '')}
            >
              <Text style={[styles.filterButtonText, !filters.followupStatus && styles.filterButtonTextActive]}>All</Text>
            </TouchableOpacity>
            {followupOptions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterButton, filters.followupStatus === status && styles.filterButtonActive]}
                onPress={() => handleFilterChange('followupStatus', status)}
              >
                <Text style={[styles.filterButtonText, filters.followupStatus === status && styles.filterButtonTextActive]}>{status}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Assigned To</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterButton, !filters.assignedTo && styles.filterButtonActive]}
              onPress={() => handleFilterChange('assignedTo', '')}
            >
              <Text style={[styles.filterButtonText, !filters.assignedTo && styles.filterButtonTextActive]}>All</Text>
            </TouchableOpacity>
            {employees?.map((employee) => (
              <TouchableOpacity
                key={employee._id}
                style={[styles.filterButton, filters.assignedTo === employee._id && styles.filterButtonActive]}
                onPress={() => handleFilterChange('assignedTo', employee._id)}
              >
                <Text style={[styles.filterButtonText, filters.assignedTo === employee._id && styles.filterButtonTextActive]}>{employee.fname} {employee.lname}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <EviButton
            title="Close"
            variant="secondary"
            size="lg"
            style={styles.closeButton}
            onPress={() => {
              setStatusModalVisible(false);
              setAdminRemarks('');
              setSelectedStatus(null); // Reset selected status
            }}
          />
        </View>
        <CustomToast />
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
            <Icon name="magnify" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.topFilterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Icon name="filter" size={20} color={colors.white} />
          <Text style={styles.topFilterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {loading && leads.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
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
              colors={[colors.brand]}
              tintColor={colors.brand}
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
            <Icon name="chevron-left" size={24} color={pagination.currentPage === 1 ? colors.inkFaint : colors.brand} />
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
            <Icon name="chevron-right" size={24} color={pagination.currentPage === pagination.totalPages ? colors.inkFaint : colors.brand} />
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
            <EviButton
              title="Close"
              variant="secondary"
              size="lg"
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            />
          </View>
          <CustomToast />
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
              placeholderTextColor={colors.inkFaint}
            />
            <EviButton
              title="Close"
              variant="secondary"
              size="lg"
              style={styles.closeButton}
              onPress={() => {
                setStatusModalVisible(false);
                setAdminRemarks('');
              }}
            />
          </View>
          <CustomToast />
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
    backgroundColor: colors.surface,
  },
  topBar: {
    backgroundColor: colors.card,
    padding: spacing.lg,
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
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    fontSize: type.sizes.sm,
    marginRight: spacing.md,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchButton: {
    backgroundColor: colors.brand,
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topFilterButton: {
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    marginLeft: spacing.md,
  },
  topFilterButtonText: {
    color: colors.white,
    fontSize: type.sizes.sm,
    fontWeight: type.weights.semibold,
    marginLeft: spacing.xs,
  },

  leadsList: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  leadCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
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
    marginBottom: spacing.lg,
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
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarInitial: {
    color: colors.brand,
    fontSize: type.sizes.display,
    fontWeight: type.weights.bold,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: type.sizes.lg,
    fontWeight: type.weights.bold,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  leadContact: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    marginBottom: 2,
  },
  leadDetails: {
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  detailItem: {
    flex: 1,
    marginRight: spacing.md,
  },
  leadDetailLabel: {
    fontSize: type.sizes.xs,
    fontWeight: type.weights.semibold,
    color: colors.inkSoft,
    marginBottom: spacing.xs,
  },
  leadDetail: {
    fontSize: type.sizes.sm,
    color: colors.ink,
  },
  leadActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.lg,
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  actionText: {
    marginLeft: 6,
    fontSize: type.sizes.sm,
    fontWeight: type.weights.medium,
    color: colors.ink,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  paginationButton: {
    padding: spacing.sm,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    marginHorizontal: spacing.lg,
    fontSize: type.sizes.sm,
    color: colors.ink,
    fontWeight: type.weights.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: type.sizes.md,
    color: colors.inkSoft,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 31, 22, 0.6)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.xl,
    elevation: 5,
  },
  modalTitle: {
    fontSize: type.sizes.xl,
    fontWeight: type.weights.bold,
    color: colors.ink,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  employeeList: {
    maxHeight: 320,
  },
  employeeItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  employeeName: {
    fontSize: type.sizes.md,
    color: colors.ink,
    fontWeight: type.weights.medium,
  },
  closeButton: {
    marginTop: spacing.xl,
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statusButton: {
    width: '48%',
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  statusButtonSelected: {
    borderWidth: 2,
    borderColor: colors.white,
    elevation: 5, // Add shadow for Android
    shadowColor: '#000', // Add shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  statusButtonText: {
    color: colors.white,
    fontWeight: type.weights.bold,
    fontSize: type.sizes.sm,
  },
  remarksInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing.md,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
    fontSize: type.sizes.sm,
    backgroundColor: colors.card,
    color: colors.ink,
  },
  filterScroll: {
    marginBottom: spacing.lg,
  },
  filterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: spacing.sm,
  },
  filterButtonText: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    fontWeight: type.weights.medium,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  filterButtonActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },

  filterLabel: {
    fontSize: type.sizes.md,
    fontWeight: type.weights.semibold,
    marginBottom: spacing.md,
    color: colors.ink,
  },
});

export default AdminLeadsScreen;
