import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet, Pressable,
  ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../../design/Icon';
import { apiCall } from '../../../components/api/apiUtils';
import { useHomeContext } from '../../../components/context/HomeContext';
import { showToast, CustomToast } from '../../../components/toast/CustomToast';
import { DonutChart } from '../../../design/charts';
import Screen from '../../../design/components/Screen';
import Card from '../../../design/components/Card';
import Button from '../../../design/components/Button';
import Avatar from '../../../design/components/Avatar';
import EmptyState from '../../../design/components/EmptyState';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * SearchScreen — global customer search, rebuilt on the "Ink & Amber"
 * design system.
 *  - same behaviour: 300ms debounced POST /api/shared/search
 *    ({ query, page, limit: 10 }), paged results from data.customers,
 *    the same empty-state copy, and the role-aware hand-off to
 *    CustomerView (admin → uid, employee → _id)
 *  - the react-native-chart-kit PieChart is replaced with the in-house
 *    DonutChart (src/design/charts.js) per the no-external-UI constraint;
 *    Paid/Outstanding keep their green/amber meaning
 *  - toasts now go through the app-wide CustomToast (was
 *    react-native-toast-message directly), with the same copy
 */

const STATUS_META = {
  active: { dot: colors.success, ink: colors.successInk, bg: colors.successSoft },
  pending: { dot: colors.warning, ink: colors.warningInk, bg: colors.warningSoft },
  completed: { dot: colors.info, ink: colors.infoInk, bg: colors.infoSoft },
};

const statusMeta = (status) =>
  STATUS_META[String(status || '').toLowerCase()] ||
  { dot: colors.neutral, ink: colors.neutralInk, bg: colors.neutralSoft };

const money = (v) => `₹${v ?? 'N/A'}`;

const StatusPill = ({ status }) => {
  const meta = statusMeta(status);
  return (
    <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
      <Text style={[type.micro, { color: meta.ink }]}>{status || 'N/A'}</Text>
    </View>
  );
};

const DetailRow = ({ icon, iconBg, iconColor, label, value }) => (
  <View style={styles.detailRow}>
    <View style={[styles.detailChip, { backgroundColor: iconBg }]}>
      <Icon name={icon} size={18} color={iconColor} />
    </View>
    <View style={styles.detailText}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const SearchScreen = () => {
  const { user } = useHomeContext();
  const navigation = useNavigation();
  const searchTimeout = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

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
          setSearchResults((prev) => [...prev, ...newResults]);
        }
        setHasMore(newResults.length === 10);
        setPage(pageNumber);
      } else {
        showToast('error', 'Error', 'Failed to fetch search results');
      }
    } catch (error) {
      console.error(error);
      showToast('error', 'Error', 'An unexpected error occurred');
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
    if (user?.role === 'admin') {
      navigation.navigate('CustomerView', { uid: selectedCustomer.uid });
    } else if (user?.role === 'employee') {
      navigation.navigate('CustomerView', { id: selectedCustomer._id });
    }
  };

  const renderCustomerItem = ({ item }) => {
    const loan = item.loans && item.loans.length > 0 ? item.loans[0] : null;
    return (
      <Card style={styles.itemCard} onPress={() => handleCustomerDetails(item)} elevation={2}>
        <Avatar name={item.name || '?'} size={52} image={item.profilePic} ring />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name || 'N/A'}</Text>
          <View style={styles.itemMetaRow}>
            <Icon name="phone" size={13} color={colors.inkMuted} />
            <Text style={styles.itemMeta} numberOfLines={1}>{item.phoneNumber || 'N/A'}</Text>
          </View>
          <View style={styles.itemMetaRow}>
            <Icon name="email" size={13} color={colors.inkMuted} />
            <Text style={styles.itemMeta} numberOfLines={1}>{item.email || 'N/A'}</Text>
          </View>
          {loan && (
            <View style={styles.loanRow}>
              <View style={styles.loanAmountRow}>
                <Icon name="currency-inr" size={14} color={colors.successInk} />
                <Text style={styles.loanAmount}>{money(loan.loanAmount)}</Text>
              </View>
              <StatusPill status={loan.status} />
            </View>
          )}
        </View>
        <Icon name="chevron-right" size={20} color={colors.inkMuted} />
      </Card>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  };

  const renderLoanDetailsModal = () => {
    if (!selectedCustomer) return null;
    const loan =
      selectedCustomer.loans && selectedCustomer.loans.length > 0
        ? selectedCustomer.loans[0]
        : null;

    const paid = loan
      ? Math.max(0, Number(loan.loanAmount) - Number(loan.outstandingAmount))
      : 0;
    const outstanding = loan ? Number(loan.outstandingAmount) || 0 : 0;
    const total = paid + outstanding;
    const donutData = loan
      ? [
          { label: 'Paid', value: paid, color: colors.success },
          { label: 'Outstanding', value: outstanding, color: colors.warning },
        ]
      : [];

    return (
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.grabber} />
            <View style={styles.modalHeader}>
              <Avatar
                name={selectedCustomer.name || '?'}
                size={52}
                image={selectedCustomer.profilePic}
                ring
              />
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedCustomer.name || 'N/A'}
                </Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {selectedCustomer.email || 'N/A'}
                </Text>
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
                hitSlop={8}
              >
                <Icon name="close" size={20} color={colors.inkSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {loan ? (
                <>
                  <View style={styles.overviewRow}>
                    <View style={styles.overviewCell}>
                      <Text style={styles.overviewLabel}>Loan Amount</Text>
                      <Text style={styles.overviewValue} numberOfLines={1} adjustsFontSizeToFit>
                        {money(loan.loanAmount)}
                      </Text>
                    </View>
                    <View style={styles.overviewCell}>
                      <Text style={styles.overviewLabel}>Outstanding</Text>
                      <Text style={styles.overviewValue} numberOfLines={1} adjustsFontSizeToFit>
                        {money(loan.outstandingAmount)}
                      </Text>
                    </View>
                    <View style={styles.overviewCell}>
                      <Text style={styles.overviewLabel}>Status</Text>
                      <StatusPill status={loan.status} />
                    </View>
                  </View>

                  <Card style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Repayment</Text>
                    <View style={styles.donutRow}>
                      <DonutChart
                        data={donutData}
                        size={140}
                        thickness={22}
                        centerValue={total ? `₹${total.toLocaleString()}` : '—'}
                        centerLabel="total"
                      />
                      <View style={styles.legendCol}>
                        {donutData.map((d, i) => (
                          <View key={i} style={styles.legendRow}>
                            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                            <Text style={styles.legendLabel} numberOfLines={1}>{d.label}</Text>
                            <Text style={styles.legendValue} numberOfLines={1}>
                              {`₹${Number(d.value).toLocaleString()}`}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </Card>

                  <Card style={styles.detailsCard}>
                    <DetailRow
                      icon="calendar-start"
                      iconBg={colors.successSoft}
                      iconColor={colors.successInk}
                      label="Start Date"
                      value={new Date(loan.loanStartDate).toLocaleDateString()}
                    />
                    <DetailRow
                      icon="calendar-end"
                      iconBg={colors.dangerSoft}
                      iconColor={colors.dangerInk}
                      label="End Date"
                      value={new Date(loan.loanEndDate).toLocaleDateString()}
                    />
                    <DetailRow
                      icon="file-document-outline"
                      iconBg={colors.infoSoft}
                      iconColor={colors.infoInk}
                      label="Documents"
                      value={loan.documentsSummary || 'N/A'}
                    />
                    <DetailRow
                      icon="calendar-clock"
                      iconBg={colors.neutralSoft}
                      iconColor={colors.neutralInk}
                      label="Repayment Schedule"
                      value={loan.repaymentSchedulesSummary || 'N/A'}
                    />
                    <DetailRow
                      icon="cash-multiple"
                      iconBg={colors.accentSoft}
                      iconColor={colors.accentDeep}
                      label="Repayments"
                      value={loan.repaymentsSummary || 'N/A'}
                    />
                    <DetailRow
                      icon="alert-circle-outline"
                      iconBg={colors.warningSoft}
                      iconColor={colors.warningInk}
                      label="Penalties"
                      value={loan.penaltiesSummary || 'N/A'}
                    />
                  </Card>
                </>
              ) : (
                <EmptyState
                  icon="search"
                  title="No active loans"
                  style={{ marginTop: spacing.lg, marginBottom: spacing.lg }}
                />
              )}
            </ScrollView>

            <View style={styles.modalButtonRow}>
              <Button label="Close" variant="outline" flex={1} onPress={() => setModalVisible(false)} />
              <Button
                label="View Full Profile"
                icon="account"
                variant="accent"
                flex={1.4}
                onPress={handleViewProfile}
              />
            </View>
            <CustomToast />
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  return (
    <Screen bg={colors.bg}>
      <View style={styles.searchCard}>
        <Icon name="magnify" size={20} color={colors.accentDeep} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, phone, or username"
          placeholderTextColor={colors.inkMuted}
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => handleSearchChange('')} hitSlop={6}>
            <Icon name="close-circle" size={20} color={colors.inkMuted} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={searchResults}
        renderItem={renderCustomerItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <EmptyState
            icon="search"
            title={searchQuery.trim() ? 'No results found' : 'Enter search criteria'}
            subtitle={
              searchQuery.trim()
                ? 'Try a different name, email, phone, or username.'
                : 'Search customers by name, email, phone, or username.'
            }
            style={{ marginTop: spacing.xxxl }}
          />
        }
      />

      {renderLoanDetailsModal()}
      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    padding: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    height: 44,
    ...type.body,
    color: colors.ink,
    paddingHorizontal: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    ...type.bodyBold,
    color: colors.ink,
    fontSize: 16,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemMeta: {
    flex: 1,
    ...type.caption,
    color: colors.inkSecondary,
  },
  loanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: spacing.sm,
  },
  loanAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loanAmount: {
    ...type.bodyBold,
    color: colors.successInk,
    fontSize: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '92%',
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingBottom: spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  modalHeaderText: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    ...type.h2,
    color: colors.ink,
  },
  modalSubtitle: {
    ...type.sub,
    color: colors.inkMuted,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  overviewCell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  overviewLabel: {
    ...type.caption,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  overviewValue: {
    ...type.bodyBold,
    color: colors.ink,
    fontSize: 15,
    textAlign: 'center',
  },
  chartCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  chartTitle: {
    ...type.title,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  legendCol: {
    flex: 1,
    gap: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  legendLabel: {
    flex: 1,
    ...type.sub,
    color: colors.inkSecondary,
  },
  legendValue: {
    ...type.bodyBold,
    color: colors.ink,
    fontSize: 13.5,
  },
  detailsCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    ...type.caption,
    color: colors.inkMuted,
  },
  detailValue: {
    ...type.body,
    color: colors.ink,
    fontWeight: '600',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
});

export default SearchScreen;
