import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast, CustomToast } from '../../../components/toast/CustomToast';
import { useNavigation } from '@react-navigation/native';
import Card from '../../../design/components/Card';
import Avatar from '../../../design/components/Avatar';
import StatusPill from '../../../design/components/StatusPill';
import EmptyState from '../../../design/components/EmptyState';
import Skeleton, { SkeletonCircle } from '../../../design/components/Skeleton';
import Icon from '../../../design/Icon';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * AllEmployeeView — employee directory rebuilt on the "Ink & Amber" design
 * system.
 *  - same data flow: GET /api/admin/employee?page=N&limit=10, page-1
 *    replace vs append, hasMore === 10, onEndReached load-more, the
 *    `loading || !hasMore` re-entry guard
 *  - Card rows with Avatar, contact facts and a semantic Active/Inactive
 *    StatusPill (was a raw green/red box), plus skeletons, empty state and
 *    pull-to-refresh (added, non-breaking)
 *  - toast switched from raw react-native-toast-message to the app's
 *    CustomToast pattern used by the rest of the redesigned screens
 */

const EmployeeRow = React.memo(({ item, onPress }) => {
  const name = `${item?.fname || ''} ${item?.lname || ''}`.trim() || 'Employee';

  return (
    <Card padded={false} elevation="subtle" onPress={onPress} style={styles.row}>
      <View style={styles.rowBody}>
        <Avatar name={name} size={48} image={item?.profilePic || null} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <View style={styles.header}>
            <Text numberOfLines={1} style={[type.bodyBold, { color: colors.ink, fontSize: 16 }]}>
              {name}
            </Text>
            <StatusPill status={item?.accountStatus ? 'Active' : 'Inactive'} />
          </View>
          <View style={styles.facts}>
            <View style={styles.fact}>
              <Icon name="account" size={14} color={colors.inkMuted} />
              <Text numberOfLines={1} style={[type.sub, { color: colors.inkSecondary, marginLeft: 6 }]}>
                @{item?.userName || '—'}
              </Text>
            </View>
            <View style={styles.fact}>
              <Icon name="phone" size={14} color={colors.inkMuted} />
              <Text style={[type.sub, { color: colors.inkSecondary, marginLeft: 6 }]}>
                {item?.phoneNumber || '—'}
              </Text>
            </View>
            <View style={styles.fact}>
              <Icon name="email" size={14} color={colors.inkMuted} />
              <Text numberOfLines={1} style={[type.sub, { color: colors.inkSecondary, marginLeft: 6 }]}>
                {item?.email || 'N/A'}
              </Text>
            </View>
          </View>
        </View>
        <Icon name="chevron-right" size={18} color={colors.inkMuted} />
      </View>
    </Card>
  );
});

const AllEmployeeView = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [failedToLoad, setFailedToLoad] = useState(false);
  const navigation = useNavigation();

  const fetchEmployees = async (pageNumber) => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const response = await apiCall(`/api/admin/employee?page=${pageNumber}&limit=10`, 'GET');
      if (response.status === 'success') {
        if (pageNumber === 1) {
          setEmployees(response.data);
        } else {
          setEmployees(prevEmployees => [...prevEmployees, ...response.data]);
        }
        setHasMore(response.data.length === 10);
        setPage(pageNumber);
        setFailedToLoad(false);
      } else {
        if (pageNumber === 1) setFailedToLoad(true);
        showToast('error', 'Error', 'Failed to fetch employees');
      }
    } catch (error) {
      console.error(error);
      if (pageNumber === 1) setFailedToLoad(true);
      showToast('error', 'Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployees(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEmployees(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore]);

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchEmployees(page + 1);
    }
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.inkMuted} />
        <Text style={[type.caption, { color: colors.inkMuted, marginTop: spacing.xs }]}>
          Loading more employees…
        </Text>
      </View>
    );
  };

  if (failedToLoad && employees.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="alert-circle"
          title="Couldn't load employees"
          subtitle="Check your connection, then try again."
          action={{ label: 'Retry', icon: 'refresh', variant: 'accent', onPress: () => fetchEmployees(1) }}
          style={{ flex: 1, justifyContent: 'center' }}
        />
        <CustomToast />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={employees}
        renderItem={({ item }) => (
          <EmployeeRow item={item} onPress={() => navigation.navigate('EmployeeView', { uid: item.uid })} />
        )}
        keyExtractor={item => item._id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="users"
              title="No employees yet"
              subtitle="Registered employees will appear here."
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
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.inkMuted} />
        }
      />
      <CustomToast />
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
    gap: spacing.sm + 4,
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

export default AllEmployeeView;
