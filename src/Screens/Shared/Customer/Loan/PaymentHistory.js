import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from '../../../../design/Icon';
import Card from '../../../../design/components/Card';
import Button from '../../../../design/components/Button';
import EmptyState from '../../../../design/components/EmptyState';
import Skeleton from '../../../../design/components/Skeleton';
import { apiCall } from '../../../../components/api/apiUtils';
import { CustomToast, showToast } from '../../../../components/toast/CustomToast';
import { useHomeContext } from '../../../../components/context/HomeContext';
import { colors, spacing, radius, type } from '../../../../design/tokens';

/**
 * Payment history — rebuilt on the "Ink & Amber" design system.
 *  - behaviour preserved 1:1: the same role-based
 *    /api/{admin|employee}/loan/repayment/history pagination (page /
 *    limit=10 / loanId, append-with-reset, hasMore = 10 results), the
 *    /api/admin/loan/repayment/history/{approve,reject} calls with their
 *    exact toasts (including the original leading-space message), the
 *    confirm-reject Alert, the admin-only approve/reject actions, and the
 *    missing-loanId error state
 *  - status colours mapped to the semantic tokens: Approved → success,
 *    Pending → warning, Rejected → danger, anything else → neutral
 *  - fix: the original keyExtractor fell back to Math.random() (fresh
 *    keys on every render — the list re-created itself constantly);
 *    now a stable index-based fallback
 *  - design: surface cards with an amount/date/status header, icon detail
 *    rows, danger/primary action buttons, skeletons and a real empty
 *    state
 */

const STATUS_CONFIG = {
  Approved: { bg: colors.successSoft, fg: colors.successInk },
  Pending: { bg: colors.warningSoft, fg: colors.warningInk },
  Rejected: { bg: colors.dangerSoft, fg: colors.dangerInk },
};

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || { bg: colors.neutralSoft, fg: colors.neutralInk };
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.statusBadgeText, { color: config.fg }]} numberOfLines={1}>
        {status || 'Unknown'}
      </Text>
    </View>
  );
};

const DetailRow = ({ icon, text }) => (
  <View style={styles.detailRow}>
    <Icon name={icon} size={16} color={colors.inkMuted} />
    <Text style={styles.detailText} numberOfLines={2}>
      {text}
    </Text>
  </View>
);

const LoadingList = () => (
  <View style={styles.page}>
    {[0, 1, 2].map((i) => (
      <Card key={i} padded={false} style={{ marginBottom: spacing.md }}>
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width="35%" height={18} />
            <Skeleton width="22%" height={24} radius={radius.full} />
          </View>
          <Skeleton width="80%" height={12} />
          <Skeleton width="65%" height={12} />
          <Skeleton width="72%" height={12} />
        </View>
      </Card>
    ))}
  </View>
);

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updateRepaymentLoading, setUpdateRepaymentLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const route = useRoute();
  const loanId = route.params?.loanId;
  const { user } = useHomeContext();

  const fetchPayments = useCallback(
    async (resetPage = false) => {
      if (loading || !loanId) return;
      setLoading(true);
      setError(null);
      try {
        const currentPage = resetPage ? 1 : page;
        const API_URL = user?.role === 'admin' ? 'api/admin' : 'api/employee';
        const response = await apiCall(
          `/${API_URL}/loan/repayment/history?page=${currentPage}&limit=10&loanId=${loanId}`,
          'GET'
        );

        if (response?.status === 'success' && Array.isArray(response.data)) {
          if (response.data.length === 0) {
            setHasMore(false);
          } else {
            setPayments((prevPayments) => (resetPage ? response.data : [...prevPayments, ...response.data]));
            setHasMore(response.data.length === 10);
            setPage((prevPage) => (resetPage ? 2 : prevPage + 1));
          }
        } else {
          setError(` ${response?.message || 'Unknown error'}`);
          showToast('error', ` ${response?.message || 'Unknown error'}`);
          setHasMore(false);
        }
      } catch (err) {
        console.error('Error fetching payments:', err);
        setError('An error occurred while fetching payments');
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [loanId, page, loading, user?.role]
  );

  useEffect(() => {
    if (loanId && hasMore && payments.length === 0) {
      fetchPayments(true);
    }
  }, [fetchPayments, loanId, hasMore, payments.length]);

  const handleConfirmReject = (repaymentId) => {
    Alert.alert('Confirm Reject', 'Are you sure you want to reject this repayment? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', onPress: () => handleReject(repaymentId) },
    ]);
  };

  const handleReject = async (repaymentId) => {
    try {
      setUpdateRepaymentLoading(true);
      const response = await apiCall('/api/admin/loan/repayment/history/reject', 'POST', { repaymentId });
      if (response.status === 'success') {
        showToast('success', 'Repayment rejected successfully');
      } else {
        showToast('error', response.message || 'Failed to reject repayment');
      }
      fetchPayments(true);
    } catch (err) {
      showToast('error', 'Failed to reject repayment');
    } finally {
      setUpdateRepaymentLoading(false);
    }
  };

  const handleApprove = async (paymentId) => {
    if (!paymentId) {
      showToast('error', 'Invalid payment ID');
      return;
    }
    try {
      setUpdateRepaymentLoading(true);
      const response = await apiCall('/api/admin/loan/repayment/history/approve', 'POST', {
        repaymentId: paymentId,
      });
      if (response.status === 'success') {
        showToast('success', 'Payment approved successfully');
        // Reset page and fetch payments again
        setPage(1);
        setPayments([]);
        fetchPayments(true);
      } else {
        showToast('error', response.message || 'Failed to approve payment');
      }
    } catch (err) {
      console.error('Error approving payment:', err);
      showToast('error', 'Failed to approve payment');
    } finally {
      setUpdateRepaymentLoading(false);
    }
  };

  const renderItem = ({ item, index }) => {
    if (!item) return null;
    const showActions = item.status !== 'Approved' && item.status !== 'Rejected' && user?.role === 'admin';

    return (
      <Card elevation="subtle" style={{ marginBottom: spacing.md }}>
        <View style={styles.itemHeader}>
          <Text style={styles.amount}>₹{item.amount || 'N/A'}</Text>
          <StatusBadge status={item.status} />
        </View>
        <View style={styles.itemDateRow}>
          <Icon name="calendar-month-outline" size={15} color={colors.inkMuted} />
          <Text style={styles.itemDate}>
            {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : 'N/A'}
          </Text>
        </View>

        <View style={styles.detailsWrap}>
          <DetailRow icon="wallet" text={`Method: ${item.paymentMethod || 'N/A'}`} />
          <DetailRow icon="currency-inr" text={`Remaining After Payment: ₹${item.balanceAfterPayment || 'N/A'}`} />
          <DetailRow icon="account-circle" text={`Collected by: ${item.collectedBy?.fname || 'Admin'} ${item.collectedBy?.lname || ''}`.trim()} />
          <DetailRow icon="receipt" text={`Transaction Note: ${item.transactionId || 'N/A'}`} />
          <DetailRow icon="notebook" text={`Logical Note: ${item.logicNote || item.LogicNote || 'N/A'}`} />
        </View>

        {showActions ? (
          <View style={styles.actionRow}>
            <Button
              label="Reject"
              icon="close-circle-outline"
              variant="danger"
              flex
              disabled={updateRepaymentLoading}
              onPress={() => handleConfirmReject(item._id)}
            />
            <Button
              label="Approve"
              icon="check-circle-outline"
              variant="primary"
              flex
              disabled={updateRepaymentLoading}
              onPress={() => handleApprove(item._id)}
            />
          </View>
        ) : null}
      </Card>
    );
  };

  if (!loanId) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="alert-circle"
          title="Loan ID is missing"
          subtitle="Please navigate here from a loan."
          style={{ marginTop: spacing.xxxl }}
        />
      </View>
    );
  }

  if (loading && payments.length === 0) {
    return (
      <View style={styles.container}>
        <LoadingList />
        <CustomToast />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={payments}
        renderItem={renderItem}
        keyExtractor={(item, index) => item?._id?.toString() || `payment-${index}`}
        onEndReached={() => {
          if (hasMore && !loading) {
            fetchPayments();
          }
        }}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          loading ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.accentDeep} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading &&
          (error ? (
            <EmptyState
              icon="warning"
              title="Unable to load payments"
              subtitle={error.trim()}
              style={{ marginTop: spacing.xxxl }}
            />
          ) : (
            <EmptyState
              icon="receipt"
              title="No payment history available"
              subtitle="Payments for this loan will appear here."
              style={{ marginTop: spacing.xxxl }}
            />
          ))
        }
        contentContainerStyle={styles.page}
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
  page: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  amount: {
    ...type.h1,
    color: colors.ink,
  },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusBadgeText: {
    ...type.micro,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  itemDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemDate: {
    ...type.caption,
    color: colors.inkMuted,
  },

  detailsWrap: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs + 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailText: {
    ...type.sub,
    color: colors.inkSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },

  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});

export default PaymentHistory;
