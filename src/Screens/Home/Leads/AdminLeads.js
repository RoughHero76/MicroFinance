import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  FlatList,
  RefreshControl,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '../../../design/Icon';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast, CustomToast } from '../../../components/toast/CustomToast';
import { useHomeContext } from '../../../components/context/HomeContext';
import Screen from '../../../design/components/Screen';
import Card from '../../../design/components/Card';
import Button from '../../../design/components/Button';
import TextField from '../../../design/components/TextField';
import Avatar from '../../../design/components/Avatar';
import EmptyState from '../../../design/components/EmptyState';
import Skeleton, { SkeletonCircle } from '../../../design/components/Skeleton';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * AdminLeads — lead pipeline rebuilt on the "Ink & Amber" design system.
 *  - same data flow: GET /api/admin/lead (page/limit/sortBy/sortOrder +
 *    optional status/followupStatus/search/assignedTo), pull-to-refresh,
 *    refetch on focus, pagination (page 1..totalPages) and the exact
 *    mutation calls: POST /:id/assign { employeeId },
 *    PATCH /:id/status { status, remarksByAdmin? } (remarks required for
 *    Approved/Rejected), DELETE /:id — all with their original Alert
 *    confirmations and toasts (the lead endpoints use `!response.error`,
 *    kept verbatim)
 *  - presentation: search + filter top bar, a stats chip strip, memoized
 *    lead cards with tinted status/follow-up pills and a 2-column detail
 *    grid, and three bottom-sheet modals (assign / status / filters)
 *  - fix: the original filter modal's Close button reset the *status*
 *    modal state and never closed the filter modal itself — it could only
 *    be dismissed via the Android back button
 */

const LEAD_STATUS_META = {
  Pending: { dot: colors.warning, ink: colors.warningInk, bg: colors.warningSoft },
  InProgress: { dot: colors.info, ink: colors.infoInk, bg: colors.infoSoft },
  Approved: { dot: colors.success, ink: colors.successInk, bg: colors.successSoft },
  Rejected: { dot: colors.danger, ink: colors.dangerInk, bg: colors.dangerSoft },
  Converted: { dot: colors.accentDeep, ink: colors.accentDeep, bg: colors.accentSoft },
  Completed: { dot: colors.success, ink: colors.successInk, bg: colors.successSoft },
  _default: { dot: colors.neutral, ink: colors.neutralInk, bg: colors.neutralSoft },
};

const statMeta = (status) => (status ? LEAD_STATUS_META[status] || LEAD_STATUS_META._default : LEAD_STATUS_META._default);

const LeadPill = ({ label, status }) => {
  const meta = statMeta(status);
  return (
    <View style={[styles.pill, { backgroundColor: meta.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: meta.dot }]} />
      <Text style={[styles.pillText, { color: meta.ink }]}>{label}</Text>
    </View>
  );
};

const STAT_DEFS = [
  { key: 'total', label: 'Total' },
  { key: 'pending', label: 'Pending' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'converted', label: 'Converted' },
];

const DetailCell = ({ label, value }) => (
  <View style={styles.detailCell}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || 'N/A'}</Text>
  </View>
);

const LeadCard = React.memo(({ lead, onAssign, onStatus, onDelete }) => {
  const name = lead.name || 'Unknown';
  return (
    <Card style={{ marginTop: spacing.md }}>
      <View style={styles.leadHeader}>
        <Avatar name={name} size={48} image={lead.pictureUrl || null} />
        <View style={styles.leadIdentity}>
          <Text style={[type.bodyBold, { color: colors.ink, fontSize: 16 }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[type.sub, { color: colors.inkSecondary }]} numberOfLines={1}>
            {lead.phone || 'No phone'}
          </Text>
          <Text style={[type.sub, { color: colors.inkSecondary }]} numberOfLines={1}>
            {lead.email || 'No email'}
          </Text>
        </View>
        <View style={styles.leadPills}>
          <LeadPill label={lead.status || 'Unknown'} status={lead.status} />
          <LeadPill label={lead.followupStatus || 'N/A'} status={lead.followupStatus} />
        </View>
      </View>

      <View style={styles.detailGrid}>
        <DetailCell label="Loan Type" value={lead.loanType} />
        <DetailCell label="Amount" value={lead.loanAmount?.toLocaleString()} />
        <DetailCell label="Duration" value={lead.loanDuration} />
        <DetailCell label="City" value={lead.city} />
        <DetailCell
          label="Assigned To"
          value={lead.AssignedTo ? `${lead.AssignedTo.fname} ${lead.AssignedTo.lname}` : 'Unassigned'}
        />
        <DetailCell label="Added By" value={lead.addedBy ? `${lead.addedBy.fname} ${lead.addedBy.lname}` : 'N/A'} />
      </View>

      <View style={styles.remarksBox}>
        <Text style={styles.remarksLabel}>Remarks</Text>
        <Text style={styles.remarksText} numberOfLines={3}>
          {lead.remarksEmployee || 'N/A'}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable hitSlop={6} style={({ pressed }) => pressed && { opacity: 0.7 }} onPress={onAssign}>
          <Icon name="account-arrow-right" size={18} color={colors.successInk} />
          <Text style={[styles.actionText, { color: colors.successInk }]}>Assign</Text>
        </Pressable>
        <Pressable hitSlop={6} style={({ pressed }) => pressed && { opacity: 0.7 }} onPress={onStatus}>
          <Icon name="clipboard-check" size={18} color={colors.warningInk} />
          <Text style={[styles.actionText, { color: colors.warningInk }]}>Status</Text>
        </Pressable>
        <Pressable hitSlop={6} style={({ pressed }) => pressed && { opacity: 0.7 }} onPress={onDelete}>
          <Icon name="delete" size={18} color={colors.dangerInk} />
          <Text style={[styles.actionText, { color: colors.dangerInk }]}>Delete</Text>
        </Pressable>
      </View>
    </Card>
  );
});

const Sheet = ({ visible, onClose, title, children }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.sheetOverlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flexGrow: 1, justifyContent: 'flex-end' }}
      >
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetGrabber} />
          <View style={styles.sheetHeader}>
            <Text style={[type.h2, { color: colors.ink }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.sheetClose}>
              <Icon name="close" size={18} color={colors.inkSecondary} />
            </Pressable>
          </View>
          {children}
          <CustomToast />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  </Modal>
);

const FilterChip = ({ label, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.85 }]}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </Pressable>
);

const AdminLeadsScreen = ({ navigation }) => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    limit: 10,
  });
  const [filters, setFilters] = useState({
    status: '',
    followupStatus: '',
    search: '',
    assignedTo: '',
    sortBy: 'date',
    sortOrder: -1,
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
        sortOrder: filters.sortOrder,
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
      return () => {};
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
      const response = await apiCall(`/api/admin/lead/${selectedLead._id}/assign`, 'POST', {
        employeeId,
      });

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
    setSelectedStatus(status);
    Alert.alert('Confirm Lead Update', `Are you sure you want to update this lead to ${status}?`, [
      { text: 'Cancel', style: 'cancel', onPress: () => setSelectedStatus(null) },
      { text: 'OK', onPress: () => updateLeadStatus(status) },
    ]);
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

      const response = await apiCall(`/api/admin/lead/${selectedLead._id}/status`, 'PATCH', payload);

      if (!response.error) {
        showToast('success', 'Success', `Lead status updated to ${status}`);
        setStatusModalVisible(false);
        setAdminRemarks('');
        setSelectedStatus(null);
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
      { text: 'OK', onPress: () => deleteLead(leadId) },
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

  const topBar = (
    <View style={styles.topBar}>
      <View style={styles.searchBox}>
        <Icon name="search" size={18} color={colors.inkMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search leads..."
          placeholderTextColor={colors.inkMuted}
          value={filters.search}
          onChangeText={(text) => handleFilterChange('search', text)}
          returnKeyType="search"
          onSubmitEditing={fetchLeads}
        />
      </View>
      <Button
        label="Filter"
        icon="filter"
        variant="accent"
        size="sm"
        style={{ marginLeft: spacing.sm }}
        onPress={() => setFilterModalVisible(true)}
      />
    </View>
  );

  const statsStrip = stats ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.statsStrip}
      contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
    >
      {STAT_DEFS.map((def) => {
        const value = stats[def.key];
        if (value === undefined || value === null) return null;
        return (
          <View key={def.key} style={styles.statChip}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{def.label}</Text>
          </View>
        );
      })}
    </ScrollView>
  ) : null;

  const renderSkeletonRow = () => (
    <Card style={styles.cardGap}>
      <View style={styles.skeletonHeaderRow}>
        <SkeletonCircle size={48} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Skeleton width="45%" height={14} />
          <View style={{ height: 8 }} />
          <Skeleton width="70%" height={12} />
          <View style={{ height: 8 }} />
          <Skeleton width="55%" height={12} />
        </View>
      </View>
      <View style={{ height: spacing.md }} />
      <Skeleton width="100%" height={14} />
      <View style={{ height: 8 }} />
      <Skeleton width="85%" height={14} />
    </Card>
  );

  const renderEmpty = () => (
    <EmptyState
      icon="file-search-outline"
      title="No leads available"
      subtitle="Try adjusting filters or create a new lead"
      style={{ paddingVertical: spacing.xxxl }}
    />
  );

  return (
    <Screen bg={colors.bg} header={topBar}>
      <View style={{ flex: 1 }}>
        {statsStrip}
        {loading && filteredLeads.length === 0 ? (
          <View style={{ padding: spacing.md }}>
            {[0, 1, 2].map((i) => (
              <React.Fragment key={i}>{renderSkeletonRow()}</React.Fragment>
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredLeads}
            renderItem={({ item }) => (
              <LeadCard
                lead={item}
                onAssign={() => {
                  setSelectedLead(item);
                  setModalVisible(true);
                }}
                onStatus={() => {
                  setSelectedLead(item);
                  setStatusModalVisible(true);
                }}
                onDelete={() => handleDeleteLead(item._id)}
              />
            )}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
            }
          />
        )}
        {pagination.totalPages > 1 && (
          <View style={styles.pagination}>
            <Pressable
              hitSlop={8}
              disabled={pagination.currentPage === 1}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
              onPress={() => handlePageChange(pagination.currentPage - 1)}
            >
              <Icon
                name="chevron-left"
                size={22}
                color={pagination.currentPage === 1 ? colors.inkFaint : colors.primary}
              />
            </Pressable>
            <Text style={styles.paginationText}>
              Page {pagination.currentPage} of {pagination.totalPages}
            </Text>
            <Pressable
              hitSlop={8}
              disabled={pagination.currentPage === pagination.totalPages}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
              onPress={() => handlePageChange(pagination.currentPage + 1)}
            >
              <Icon
                name="chevron-right"
                size={22}
                color={pagination.currentPage === pagination.totalPages ? colors.inkFaint : colors.primary}
              />
            </Pressable>
          </View>
        )}
      </View>

      <Sheet visible={modalVisible} onClose={() => setModalVisible(false)} title="Assign Employee">
        {employees && employees.length > 0 ? (
          <ScrollView style={{ maxHeight: '60%' }}>
            {employees.map((employee) => (
              <Pressable
                key={employee._id}
                style={({ pressed }) => [styles.employeeRow, pressed && { opacity: 0.85 }]}
                onPress={() => assignEmployee(employee._id)}
              >
                <Avatar name={`${employee.fname || ''} ${employee.lname || ''}`} size={40} />
                <Text style={styles.employeeName}>
                  {employee.fname} {employee.lname}
                </Text>
                <Icon name="chevron-right" size={18} color={colors.inkMuted} />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            icon="users"
            title="No employees yet"
            subtitle="Register an employee first, then assign leads."
          />
        )}
      </Sheet>

      <Sheet
        visible={statusModalVisible}
        onClose={() => {
          setStatusModalVisible(false);
          setAdminRemarks('');
          setSelectedStatus(null);
        }}
        title="Update Lead Status"
      >
        <View style={styles.statusGrid}>
          {statusOptions.map((status) => {
            const meta = LEAD_STATUS_META[status];
            const selected = selectedStatus === status;
            return (
              <Pressable
                key={status}
                style={[
                  styles.statusOption,
                  { backgroundColor: meta.bg, borderColor: selected ? meta.ink : 'transparent' },
                ]}
              onPress={() => updateLeadCheck(status)}
              >
                <View style={[styles.statusOptionDot, { backgroundColor: meta.dot }]} />
                <Text style={[styles.statusOptionText, { color: meta.ink }]}>{status}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextField
          label="Admin remarks"
          placeholder="e.g. verified income documents"
          value={adminRemarks}
          onChangeText={setAdminRemarks}
          hint="Required for Approve/Reject"
          multiline
        />
      </Sheet>

      <Sheet visible={filterModalVisible} onClose={() => setFilterModalVisible(false)} title="Filter Leads">
        <Text style={styles.filterSectionLabel}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip label="All" active={!filters.status} onPress={() => handleFilterChange('status', '')} />
          {statusOptions.map((status) => (
            <FilterChip
              key={status}
              label={status}
              active={filters.status === status}
              onPress={() => handleFilterChange('status', status)}
            />
          ))}
        </ScrollView>

        <Text style={styles.filterSectionLabel}>Follow-up Status</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <FilterChip
            label="All"
            active={!filters.followupStatus}
            onPress={() => handleFilterChange('followupStatus', '')}
          />
          {followupOptions.map((status) => (
            <FilterChip
              key={status}
              label={status}
              active={filters.followupStatus === status}
              onPress={() => handleFilterChange('followupStatus', status)}
            />
          ))}
        </ScrollView>

        <Text style={styles.filterSectionLabel}>Assigned To</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <FilterChip
            label="All"
            active={!filters.assignedTo}
            onPress={() => handleFilterChange('assignedTo', '')}
          />
          {employees?.map((employee) => (
            <FilterChip
              key={employee._id}
              label={`${employee.fname} ${employee.lname}`}
              active={filters.assignedTo === employee._id}
              onPress={() => handleFilterChange('assignedTo', employee._id)}
            />
          ))}
        </ScrollView>
      </Sheet>

      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 38,
    marginLeft: spacing.xs,
    color: colors.ink,
    fontSize: 14,
  },
  statsStrip: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
  statValue: {
    ...type.bodyBold,
    color: colors.ink,
  },
  statLabel: {
    ...type.caption,
    color: colors.inkMuted,
    marginLeft: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  leadHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  leadIdentity: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
    justifyContent: 'center',
  },
  leadPills: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  pillText: {
    ...type.micro,
    fontWeight: '600',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailCell: {
    width: '48%',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    ...type.caption,
    color: colors.inkMuted,
    marginBottom: 2,
  },
  detailValue: {
    ...type.body,
    color: colors.ink,
  },
  remarksBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  remarksLabel: {
    ...type.caption,
    color: colors.inkMuted,
    marginBottom: 4,
  },
  remarksText: {
    ...type.sub,
    color: colors.inkSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  actionText: {
    marginLeft: 6,
    ...type.sub,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  paginationText: {
    ...type.sub,
    color: colors.ink,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.inkFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  employeeName: {
    flex: 1,
    marginLeft: spacing.md,
    ...type.body,
    color: colors.ink,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  statusOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  statusOptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusOptionText: {
    ...type.bodyBold,
  },
  filterSectionLabel: {
    ...type.caption,
    color: colors.inkSecondary,
    fontWeight: '700',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  chipRow: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentDeep,
  },
  chipText: {
    ...type.sub,
    color: colors.inkSecondary,
  },
  chipTextActive: {
    color: colors.accentDeep,
    fontWeight: '600',
  },
  skeletonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AdminLeadsScreen;
