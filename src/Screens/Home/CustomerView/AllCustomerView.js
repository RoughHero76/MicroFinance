import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast } from '../../../components/toast/CustomToast';
import { cacheImage } from '../../../components/Image/ImageCache';
import Card from '../../../design/components/Card';
import Avatar from '../../../design/components/Avatar';
import StatusPill from '../../../design/components/StatusPill';
import EmptyState from '../../../design/components/EmptyState';
import Skeleton, { SkeletonCircle } from '../../../design/components/Skeleton';
import Icon from '../../../design/Icon';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * AllCustomerView — paginated customer list rebuilt on the "Ink & Amber"
 * design system.
 *  - Card rows with deterministic avatars, semantic StatusPills per loan,
 *    and icon-led contact details instead of the old flat list
 *  - keeps the original behaviour: page/limit=10 pagination, infinite
 *    scroll, pull-to-refresh, image caching, CustomerView navigation
 *  - empty state with an "Add Customer" shortcut; ink-tinted refresh control
 */

const CustomerItem = React.memo(({ item, onPress }) => {
  const [imageUri, setImageUri] = useState(item?.profilePic || null);

  useEffect(() => {
    let active = true;
    const loadCachedImage = async () => {
      if (item?.profilePic) {
        const cachedUri = await cacheImage(item.profilePic);
        if (active && cachedUri) setImageUri(cachedUri);
      }
    };
    loadCachedImage();
    return () => { active = false; };
  }, [item?.profilePic]);

  const name = `${item?.fname || ''} ${item?.lname || ''}`.trim() || 'Customer';
  const loans = item?.loans || [];

  return (
    <Card onPress={onPress} padded={false} elevation="subtle" style={styles.row}>
        <View style={styles.header}>
          <Avatar name={name} size={52} image={imageUri} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text numberOfLines={1} style={[type.bodyBold, { color: colors.ink, fontSize: 16 }]}>
              {name}
            </Text>
            <View style={styles.metaRow}>
              <Icon name="phone" size={13} color={colors.inkMuted} />
              <Text numberOfLines={1} style={[type.sub, { color: colors.inkSecondary, marginLeft: 5 }]}>
                {item?.phoneNumber || 'No phone'}
              </Text>
            </View>
            <View style={[styles.metaRow, { marginTop: 2 }]}>
              <Icon name="map-marker" size={13} color={colors.inkMuted} />
              <Text
                numberOfLines={1}
                style={[type.sub, { color: colors.inkSecondary, marginLeft: 5 }]}
              >
                {[item?.address, item?.city].filter(Boolean).join(', ') || 'No address'}
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={18} color={colors.inkMuted} />
        </View>

        {loans.length > 0 && (
          <View style={styles.loansBlock}>
            {loans.map((loan) => (
              <View key={loan?._id || loan?.loanNumber} style={styles.loanTile}>
                <View style={styles.loanTop}>
                  <Text numberOfLines={1} style={[type.sub, { color: colors.inkSecondary }]}>
                    Loan #{loan?.loanNumber ?? '—'}
                  </Text>
                  {loan?.status ? <StatusPill status={loan.status} /> : null}
                </View>
                <View style={styles.loanBottom}>
                  <View style={styles.loanFact}>
                    <Icon name="currency-inr" size={13} color={colors.successInk} />
                    <Text style={[type.sub, { color: colors.inkSecondary, marginLeft: 5 }]}>
                      {loan?.loanAmount ?? '—'}
                    </Text>
                  </View>
                  <View style={styles.loanFact}>
                    <Icon name="calendar-range" size={13} color={colors.infoInk} />
                    <Text style={[type.sub, { color: colors.inkSecondary, marginLeft: 5 }]}>
                      {loan?.loanDuration || '—'}
                    </Text>
                  </View>
                  {loan?.assignedTo && (
                    <View style={[styles.loanFact, { marginLeft: 'auto' }]}>
                      <Icon name="user" size={13} color={colors.inkMuted} />
                      <Text
                        numberOfLines={1}
                        style={[type.sub, { color: colors.inkMuted, marginLeft: 5 }]}
                      >
                        {`${loan.assignedTo.fname || ''} ${loan.assignedTo.lname || ''}`.trim()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
    </Card>
  );
});

const AllCustomerView = () => {
  const navigation = useNavigation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const fetchCustomers = useCallback(async (pageNumber) => {
    setLoading(true);
    try {
      const response = await apiCall(`/api/admin/customer?page=${pageNumber}&limit=10`, 'GET');
      if (response?.status === 'success') {
        if (pageNumber === 1) {
          setCustomers(response.data || []);
        } else {
          setCustomers((prev) => [...prev, ...(response.data || [])]);
        }
        setHasMore((response.data || []).length === 10);
        setPage(pageNumber);
        setFailed(false);
      } else {
        if (pageNumber === 1) setFailed(true);
        showToast('error', 'Error', response?.message || 'Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      if (pageNumber === 1) setFailed(true);
      showToast('error', 'Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCustomers(1);
  }, [fetchCustomers]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) fetchCustomers(page + 1);
  }, [hasMore, loading, page, fetchCustomers]);

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.inkMuted} />
        <Text style={[type.caption, { color: colors.inkMuted, marginTop: spacing.xs }]}>
          Loading more customers…
        </Text>
      </View>
    );
  };

  if (!loading && failed && customers.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="alert-circle"
          title="Couldn't load customers"
          subtitle="Check your connection, then try again."
          action={{ label: 'Retry', icon: 'refresh', variant: 'accent', onPress: () => fetchCustomers(1) }}
          style={{ flex: 1, justifyContent: 'center' }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={customers}
        renderItem={({ item }) => (
          <CustomerItem
            item={item}
            onPress={() => navigation.navigate('CustomerView', { uid: item?.uid })}
          />
        )}
        keyExtractor={(item) => item?._id || item?.uid || Math.random().toString(36).slice(2)}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.15}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="users"
              title="No customers yet"
              subtitle="Customers you register will appear here."
              action={{ label: 'Add Customer', icon: 'account-plus', variant: 'accent', onPress: () => navigation.navigate('CustomerRegistration') }}
            />
          ) : (
            <View style={styles.emptyLoading}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.skeletonRow}>
                  <SkeletonCircle size={48} />
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.inkMuted}
          />
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
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  row: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  loansBlock: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    margin: spacing.md,
    marginTop: 0,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  loanTile: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  loanTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  loanBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  loanFact: {
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

export default AllCustomerView;
