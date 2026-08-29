import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useHomeContext } from '../../components/context/HomeContext';
import { apiCall } from '../../components/api/apiUtils';
import { useNavigation } from '@react-navigation/native';
import { CustomToast } from '../../components/toast/CustomToast';
import Screen from '../../design/components/Screen';
import Button from '../../design/components/Button';
import Card from '../../design/components/Card';
import StatCard from '../../design/components/StatCard';
import Avatar from '../../design/components/Avatar';
import StatusPill from '../../design/components/StatusPill';
import EmptyState from '../../design/components/EmptyState';
import Skeleton, { SkeletonCircle } from '../../design/components/Skeleton';
import Icon from '../../design/Icon';
import { FadeInUp } from '../../design/motion';
import { colors, spacing, radius, type } from '../../design/tokens';

/**
 * HomeScreen (admin dashboard) — rebuilt on the "Ink & Amber" design system.
 *  - StatCards for portfolio numbers, a brand CTA tile for the approvals
 *    queue, a Quick Actions grid, and a recent-customer list with avatars +
 *    semantic status pills
 *  - shimmer skeleton while loading; a failed fetch now shows an EmptyState
 *    with Retry (previously a broken fetch left a blank page)
 *  - pull-to-refresh, staggered reanimated entrance, all original navigation
 *    targets and data fields preserved
 */

const TONES = {
  accent: { bg: colors.accentSoft, fg: colors.accentDeep },
  danger: { bg: colors.dangerSoft, fg: colors.dangerInk },
  primary: { bg: colors.neutralSoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.successInk },
};

const ActionTile = ({ icon, label, onPress, tone = 'primary', style }) => {
  const t = TONES[tone] || TONES.primary;
  return (
    <Card tone="surface" padded={false} onPress={onPress} elevation="subtle" style={{ width: '48%', ...style }}>
      <View style={{ padding: spacing.lg, alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            backgroundColor: t.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={22} color={t.fg} />
        </View>
        <Text numberOfLines={1} style={[type.bodyBold, { color: colors.ink }]}>
          {label}
        </Text>
      </View>
    </Card>
  );
};

const SectionLabel = ({ children }) => (
  <Text
    style={[
      type.caption,
      { color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
    ]}
  >
    {children}
  </Text>
);

const ApprovalsCTA = ({ onPress, style }) => (
  <Card tone="accent" padded={false} onPress={onPress} elevation="subtle" style={{ width: '48%', ...style }}>
    <View style={{ padding: spacing.lg }}>
      <Text style={[type.caption, { color: colors.accentDeep, letterSpacing: 0.8 }]}>APPROVALS</Text>
      <Text numberOfLines={2} style={[type.title, { color: colors.ink, marginTop: 4 }]}>
        Review pending repayments
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 4 }}>
        <Text style={[type.bodyBold, { color: colors.accentDeep }]}>Open queue</Text>
        <Icon name="chevron-right" size={16} color={colors.accentDeep} />
      </View>
    </View>
  </Card>
);

const LoadingDashboard = ({ name }) => (
  <View style={styles.page}>
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={[type.h1, { color: colors.ink }]}>Welcome, {name}!</Text>
      <View style={{ height: spacing.sm }} />
      <Skeleton width="60%" height={14} />
    </View>
    <SectionLabel>Overview</SectionLabel>
    <View style={styles.grid}>
      <Skeleton width="48%" height={92} radius={radius.lg} />
      <Skeleton width="48%" height={92} radius={radius.lg} style={{ marginLeft: spacing.md }} />
      <Skeleton width="48%" height={92} radius={radius.lg} style={{ marginTop: spacing.md }} />
      <Skeleton width="48%" height={92} radius={radius.lg} style={{ marginLeft: spacing.md, marginTop: spacing.md }} />
    </View>
    <View style={{ height: spacing.xl }} />
    <SectionLabel>Recent Customers</SectionLabel>
    {[0, 1, 2].map((i) => (
      <View key={i} style={styles.skeletonRow}>
        <SkeletonCircle size={44} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Skeleton width="45%" height={14} />
          <View style={{ height: spacing.xs }} />
          <Skeleton width="30%" height={12} />
        </View>
      </View>
    ))}
  </View>
);

const HomeScreen = () => {
  const { user } = useHomeContext();
  const [dashboardData, setDashboardData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await apiCall('/api/admin/dashboard', 'GET');
      if (response?.status === 'success') {
        setDashboardData(response.data);
      } else {
        setDashboardData(null);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const name = `${user?.fname || ''} ${user?.lname || ''}`.trim() || 'Admin';
  const recentCustomers = dashboardData?.recentCustomers || [];

  const goTo = useCallback((route, params) => () => navigation.navigate(route, params), [navigation]);

  if (loading) {
    return (
      <Screen scroll bg={colors.bg}>
        <LoadingDashboard name={name} />
        <CustomToast />
      </Screen>
    );
  }

  if (!dashboardData) {
    return (
      <Screen scroll bg={colors.bg}>
        <EmptyState
          icon="alert-circle"
          title="Couldn't load your dashboard"
          subtitle="Check your connection, then try again."
          action={{
            label: 'Retry',
            icon: 'refresh',
            variant: 'accent',
            onPress: fetchDashboardData,
          }}
          style={{ flex: 1, justifyContent: 'center' }}
        />
        <CustomToast />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      bg={colors.bg}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.inkMuted} />
      }
      scrollProps={{ contentContainerStyle: styles.page, showsVerticalScrollIndicator: false }}
    >
      <FadeInUp>
        <View>
          <Text style={[type.h1, { color: colors.ink }]}>Welcome, {name}!</Text>
          <Text style={[type.body, { color: colors.inkSecondary, marginTop: 4 }]}>
            Here's your portfolio at a glance.
          </Text>
        </View>
      </FadeInUp>

      <View style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
        <SectionLabel>Overview</SectionLabel>
      </View>
      <FadeInUp delay={60}>
        <View style={styles.grid}>
          <StatCard icon="bank" label="Active Loans" value={dashboardData.loanCount} tone="accent" onPress={goTo('LoansView')} style={{ width: '48%' }} />
          <StatCard
            icon="account-group"
            label="Customers"
            value={dashboardData.customerCount}
            tone="info"
            onPress={goTo('AllCustomerView')}
            style={{ width: '48%', marginLeft: spacing.md }}
          />
          <StatCard
            icon="lead-pencil"
            label="New Leads"
            value={dashboardData.newLeads}
            tone="success"
            onPress={goTo('AdminLeadsScreen')}
            style={{ width: '48%', marginTop: spacing.md }}
          />
          <ApprovalsCTA onPress={goTo('RepaymentApprovalScreen')} style={{ marginLeft: spacing.md, marginTop: spacing.md }} />
        </View>
      </FadeInUp>

      <View style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
        <SectionLabel>Quick Actions</SectionLabel>
      </View>
      <FadeInUp delay={120}>
        <View style={styles.grid}>
          <ActionTile icon="chart-bar" label="NPA Report" tone="danger" onPress={goTo('NpaReportScreen')} />
          <ActionTile icon="chart-line" label="Reports" tone="primary" onPress={goTo('ReportsScreen')} style={{ marginLeft: spacing.md }} />
          <ActionTile icon="calculator" label="Loan Calculator" tone="accent" onPress={goTo('LoanCalculator')} style={{ marginTop: spacing.md }} />
          <ActionTile icon="users" label="Employees" tone="success" onPress={goTo('AllEmployeeView')} style={{ marginLeft: spacing.md, marginTop: spacing.md }} />
        </View>
      </FadeInUp>

      <View style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
        <SectionLabel>Recent Customers</SectionLabel>
      </View>
      <FadeInUp delay={180}>
        {recentCustomers.length === 0 ? (
          <EmptyState icon="users" title="No customers yet" subtitle="New customers will show up here." />
        ) : (
          recentCustomers.map((customer, i) => {
            const loans = customer.loans || [];
            const latest = loans[0];
            return (
              <Card
                key={customer.uid}
                padded={false}
                elevation="subtle"
                onPress={() => navigation.navigate('CustomerView', { uid: customer.uid })}
                style={{ marginBottom: i === recentCustomers.length - 1 ? 0 : spacing.md }}
              >
                <View style={styles.customerRow}>
                  <Avatar name={`${customer.fname || ''} ${customer.lname || ''}`} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={[type.bodyBold, { color: colors.ink }]}>
                      {`${customer.fname || ''} ${customer.lname || ''}`.trim() || 'Customer'}
                    </Text>
                    <Text numberOfLines={1} style={[type.sub, { color: colors.inkMuted, marginTop: 2 }]}>
                      {loans.length} {loans.length === 1 ? 'loan' : 'loans'}
                      {latest?.loanAmount != null ? ` · Latest ${latest.loanAmount}` : ''}
                    </Text>
                  </View>
                  {latest?.status ? <StatusPill status={latest.status} style={{ marginRight: spacing.xs }} /> : null}
                  <Icon name="chevron-right" size={18} color={colors.inkMuted} />
                </View>
              </Card>
            );
          })
        )}
      </FadeInUp>

      <View style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
        <Button label="View All Customers" icon="users" variant="outline" size="lg" full onPress={goTo('AllCustomerView')} />
      </View>

      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
});

export default HomeScreen;
