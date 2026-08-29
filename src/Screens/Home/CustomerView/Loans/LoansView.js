import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiCall } from '../../../../components/api/apiUtils';
import { showToast } from '../../../../components/toast/CustomToast';
import Card from '../../../../design/components/Card';
import Avatar from '../../../../design/components/Avatar';
import StatusPill from '../../../../design/components/StatusPill';
import EmptyState from '../../../../design/components/EmptyState';
import Skeleton, { SkeletonCircle } from '../../../../design/components/Skeleton';
import Icon from '../../../../design/Icon';
import { colors, spacing, radius, type } from '../../../../design/tokens';

/**
 * LoansView — admin loan list rebuilt on the "Ink & Amber" design system.
 *  - status chips + sort chips (with direction indicator) drive the same
 *    query the original built: includeCustomerProfile / includeAssignedTo /
 *    includePenalty / sortBy / sortOrder / optional status
 *  - Card rows with deterministic avatars, semantic StatusPills and
 *    icon-led facts (amount / duration / assignee)
 *  - keeps original behaviour verbatim: page/limit=10 pagination, infinite
 *    scroll, the Customer Profile / Loan / Close Alert, hasMore === 10 rows
 *  - empty state + failed-load state with Retry (was a bare red text before)
 */

const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected', 'Active', 'Closed'];
const SORT_OPTIONS = [
  { label: 'Loan Number', value: 'loanNumber' },
  { label: 'Created', value: 'createdAt' },
  { label: 'Updated', value: 'updatedAt' },
];

const LoanItem = React.memo(({ item, onPress }) => {
  const customer = item?.customer || {};
  const name = `${customer.fname || ''} ${customer.lname || ''}`.trim() || 'Customer';
  const assignee = `${item?.assignedTo?.fname || ''} ${item?.assignedTo?.lname || ''}`.trim();

  return (
    <Card padded={false} elevation="subtle" onPress={onPress} style={styles.row}>
      <View style={styles.rowBody}>
        <Avatar name={name} size={44} image={customer.profilePic || null} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <View style={styles.header}>
            <Text numberOfLines={1} style={[type.bodyBold, { color: colors.ink, fontSize: 16 }]}>
              Loan #{item?.loanNumber ?? '—'}
            </Text>
            {item?.status ? <StatusPill status={item.status} /> : null}
          </View>
          <Text numberOfLines={1} style={[type.sub, { color: colors.inkSecondary, marginTop: 2 }]}>
            {name}
          </Text>
          <View style={styles.facts}>
            <View style={styles.fact}>
              <Icon name="currency-inr" size={13} color={colors.successInk} />
              <Text style={[type.sub, { color: colors.inkSecondary, marginLeft: 5 }]}>
                {item?.loanAmount ?? '—'}
              </Text>
            </View>
            <View style={styles.fact}>
              <Icon name="calendar-range" size={13} color={colors.infoInk} />
              <Text style={[type.sub, { color: colors.inkSecondary, marginLeft: 5 }]}>
                {item?.loanDuration || '—'}
              </Text>
            </View>
            {assignee ? (
              <View style={styles.fact}>
                <Icon name="user" size={13} color={colors.inkMuted} />
                <Text numberOfLines={1} style={[type.sub, { color: colors.inkMuted, marginLeft: 5 }]}>
                  {assignee}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Icon name="chevron-right" size={18} color={colors.inkMuted} />
      </View>
    </Card>
  );
});

const Chip = ({ label, active, onPress, icon }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.chip,
      active && styles.chipActive,
      pressed && { opacity: 0.85 },
    ]}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    {icon ? <Icon name={icon} size={14} color={active ? colors.accentInk : colors.inkMuted} /> : null}
  </Pressable>
);

const LoansView = () => {
  const navigation = useNavigation();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('loanNumber');
  const [sortOrder, setSortOrder] = useState(1);
  const [failedToLoad, setFailedToLoad] = useState(false);

  const fetchLoans = useCallback(async (pageNumber) => {
    setLoading(true);
    try {
      const filterParam = filter ? `&status=${filter}` : '';
      const response = await apiCall(
        `/api/admin/loan?includeCustomerProfile=true&page=${pageNumber}&limit=10&includeAssignedTo=true&includePenalty=true&sortBy=${sortBy}&sortOrder=${sortOrder}${filterParam}`
      );

      if (response.status === 'success') {
        const data = response.data || [];
        if (pageNumber === 1) {
          setLoans(data);
        } else {
          setLoans((prevLoans) => [...prevLoans, ...data]);
        }
        setHasMore(data.length === 10);
        setPage(pageNumber);
        setFailedToLoad(false);
      } else {
        if (pageNumber === 1) setFailedToLoad(true);
        showToast('error', 'Error', 'Failed to fetch loans');
      }
    } catch (error) {
      console.error(error);
      if (pageNumber === 1) setFailedToLoad(true);
      showToast('error', 'Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, sortBy, sortOrder]);

  useEffect(() => {
    fetchLoans(1);
  }, [fetchLoans]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLoans(1);
  }, [fetchLoans]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) fetchLoans(page + 1);
  }, [hasMore, loading, page, fetchLoans]);

  const handleLoanPress = (loan) => {
    //Check if user wants to open loan of customer profile
    Alert.alert(
      'Open',
      'Please select below',
      [
        {
          text: 'Customer Profile',
          onPress: () => navigation.navigate('CustomerView', { uid: loan.customer.uid }),
          style: 'cancel',
        },
        {
          text: 'Loan',
          onPress: () => navigation.navigate('LoanDetails', { loanId: loan._id }),
        },
        {
          text: 'Close',
          onPress: () => { },
          style: 'cancel',
        }
      ]
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.inkMuted} />
        <Text style={[type.caption, { color: colors.inkMuted, marginTop: spacing.xs }]}>
          Loading more loans…
        </Text>
      </View>
    );
  };

  const renderToolbar = () => (
    <View style={styles.toolbar}>
      <View style={styles.chipRow}>
        <Chip
          label="All"
          active={filter === ''}
          onPress={() => setFilter('')}
        />
        {STATUS_OPTIONS.map((status) => (
          <Chip
            key={status}
            label={status}
            active={filter === status}
            onPress={() => setFilter(filter === status ? '' : status)}
          />
        ))}
      </View>
      <View style={[styles.chipRow, { marginTop: spacing.sm }]}>
        {SORT_OPTIONS.map((option) => {
          const active = sortBy === option.value;
          return (
            <Chip
              key={option.value}
              label={option.label}
              active={active}
              icon={active ? (sortOrder === 1 ? 'chevron-up' : 'chevron-down') : null}
              onPress={() => {
                if (active) {
                  setSortOrder(sortOrder === 1 ? -1 : 1);
                } else {
                  setSortBy(option.value);
                  setSortOrder(1);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );

  if (failedToLoad && loans.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="alert-circle"
          title="Couldn't load loans"
          subtitle="Check your connection, then try again."
          action={{ label: 'Retry', icon: 'refresh', variant: 'accent', onPress: () => fetchLoans(1) }}
          style={{ flex: 1, justifyContent: 'center' }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderToolbar()}
      <FlatList
        data={loans}
        renderItem={({ item }) => (
          <LoanItem item={item} onPress={() => handleLoanPress(item)} />
        )}
        keyExtractor={(item) => item?._id || Math.random().toString(36).slice(2)}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.15}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="receipt"
              title="No loans yet"
              subtitle="Loans appear here once applications are raised."
            />
          ) : (
            <View style={styles.emptyLoading}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.skeletonRow}>
                  <SkeletonCircle size={44} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Skeleton width="45%" height={14} />
                    <View style={{ height: spacing.xs }} />
                    <Skeleton width="70%" height={12} />
                  </View>
                </View>
              ))}
            </View>
          )
        }
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.inkMuted} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  toolbar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.md,
    paddingBottom: spacing.sm + 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.inkFaint,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipText: {
    ...type.caption,
    color: colors.inkSecondary,
  },
  chipTextActive: {
    color: colors.accentInk,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  row: {
    marginBottom: spacing.md,
  },
  rowBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs + 2,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyLoading: {
    marginTop: spacing.xl,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
});

export default LoansView;
