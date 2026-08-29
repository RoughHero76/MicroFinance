import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useHomeContext } from '../../../components/context/HomeContext';
import { apiCall } from '../../../components/api/apiUtils';
import { useNavigation } from '@react-navigation/native';
import Screen from '../../../design/components/Screen';
import StatCard from '../../../design/components/StatCard';
import Skeleton from '../../../design/components/Skeleton';
import { FadeInUp } from '../../../design/motion';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * HomeScreen (employee dashboard) — rebuilt on the "Ink & Amber" design
 * system to match the admin dashboard language.
 *  - same behaviour: the same two fetches (today's collection count +
 *    total customers, and /api/shared/loan/status/statistics?assignedTo=me),
 *    the same SMA level helper, pull-to-refresh and all navigation targets
 *    (TodaysCollectionScreen, AllCustomerView, LeadListScreen,
 *    LoanStatusDetails with npa/sma params)
 *  - missing icon names from the old build (account-details,
 *    alert-decagram, alert-octagon-outline, alert-octagram) are mapped to
 *    verified design icons (cash-check, alert-decagon, alert-triangle,
 *    alert-circle)
 *  - the Customers tile now shows the fetched customer count (the old code
 *    fetched it but hard-coded 'N/A')
 *  - the decorative logo ImageBackground is dropped for the system
 *    background; skeletons + semantic tones replace the flat white cards
 */

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

const LoadingDashboard = ({ name }) => (
  <View style={styles.page}>
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={[type.h1, { color: colors.ink }]}>Welcome, {name}!</Text>
      <View style={{ height: spacing.sm }} />
      <Skeleton width="55%" height={14} />
    </View>
    <SectionLabel>Overview</SectionLabel>
    <View style={styles.grid}>
      <Skeleton width="48%" height={92} radius={radius.lg} />
      <Skeleton width="48%" height={92} radius={radius.lg} style={{ marginLeft: spacing.md }} />
      <Skeleton width="48%" height={92} radius={radius.lg} style={{ marginTop: spacing.md }} />
      <Skeleton width="48%" height={92} radius={radius.lg} style={{ marginLeft: spacing.md, marginTop: spacing.md }} />
    </View>
    <View style={{ height: spacing.xl }} />
    <SectionLabel>NPA Loans</SectionLabel>
    <Skeleton width="100%" height={92} radius={radius.lg} />
    <View style={{ height: spacing.xl }} />
    <SectionLabel>SMA Loans</SectionLabel>
    <View style={styles.grid}>
      <Skeleton width="32%" height={92} radius={radius.lg} />
      <Skeleton width="32%" height={92} radius={radius.lg} style={{ marginLeft: spacing.sm }} />
      <Skeleton width="32%" height={92} radius={radius.lg} style={{ marginLeft: spacing.sm }} />
    </View>
  </View>
);

const HomeScreen = () => {
  const { user } = useHomeContext();
  const navigation = useNavigation();

  const [loanCount, setLoanCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statisticsData, setStatisticData] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [loanCountRes, customerCountRes] = await Promise.all([
        apiCall('/api/employee/loan/collection/today/count', 'GET'),
        apiCall('/api/admin/customer/count/total', 'GET'),
      ]);
      setLoanCount(loanCountRes.count);
      setCustomerCount(customerCountRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const response = await apiCall('/api/shared/loan/status/statistics?assignedTo=me');
      if (!response.error) {
        setStatisticData(response.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchDashboardData(), fetchData()]).then(() => setRefreshing(false));
  };

  // Helper function to safely get SMA level data
  const getSMALevelData = (level) => {
    if (!statisticsData?.statistics?.smaLevels) return { count: 0, percentage: '0' };
    const smaData = statisticsData.statistics.smaLevels.find((sma) => sma.level === level);
    return smaData || { count: 0, percentage: '0' };
  };

  const name = `${user?.fname || ''} ${user?.lname || ''}`.trim() || 'Team';

  if (loading) {
    return <Screen scroll bg={colors.bg} scrollProps={{ contentContainerStyle: styles.page }}><LoadingDashboard name={name} /></Screen>;
  }

  return (
    <Screen
      scroll
      bg={colors.bg}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.inkMuted} />}
      scrollProps={{ contentContainerStyle: styles.page, showsVerticalScrollIndicator: false }}
    >
      <FadeInUp>
        <View>
          <Text style={[type.h1, { color: colors.ink }]}>Welcome, {name}!</Text>
          <Text style={[type.body, { color: colors.inkSecondary, marginTop: 4 }]}>
            Here is today's field summary.
          </Text>
        </View>
      </FadeInUp>

      <View style={styles.sectionGap}>
        <SectionLabel>Overview</SectionLabel>
        <View style={styles.grid}>
          <StatCard
            icon="cash-check"
            label="Today's Collections"
            value={loanCount}
            tone="accent"
            onPress={() => navigation.navigate('TodaysCollectionScreen')}
            style={{ width: '48%' }}
          />
          <StatCard
            icon="account-group"
            label="Customers"
            value={customerCount || 'N/A'}
            tone="info"
            onPress={() => navigation.navigate('AllCustomerView')}
            style={{ width: '48%', marginLeft: spacing.md }}
          />
          <StatCard
            icon="lead-pencil"
            label="Leads"
            value="N/A"
            tone="success"
            onPress={() => navigation.navigate('LeadListScreen')}
            style={{ width: '48%', marginTop: spacing.md }}
          />
          <StatCard
            icon="bank"
            label="Total Loans"
            value={statisticsData?.statistics?.overall?.totalLoans ?? 0}
            tone="primary"
            style={{ width: '48%', marginLeft: spacing.md, marginTop: spacing.md }}
          />
        </View>
      </View>

      <View style={styles.sectionGap}>
        <SectionLabel>NPA Loans</SectionLabel>
        <StatCard
          icon="alert-decagon"
          label="NPA Loans"
          value={statisticsData?.statistics?.overall?.totalNPA ?? 0}
          tone="danger"
          onPress={() => navigation.navigate('LoanStatusDetails', { type: 'npa', assignedTo: 'me' })}
        />
      </View>

      <View style={styles.sectionGap}>
        <SectionLabel>SMA Loans</SectionLabel>
        <View style={styles.grid}>
          <StatCard
            icon="alert-circle-outline"
            label="SMA 0"
            value={getSMALevelData(0).count}
            tone="warning"
            onPress={() => navigation.navigate('LoanStatusDetails', { type: 'sma', smaLevel: 0, assignedTo: 'me' })}
            style={{ width: '32%' }}
          />
          <StatCard
            icon="alert-triangle"
            label="SMA 1"
            value={getSMALevelData(1).count}
            tone="warning"
            onPress={() => navigation.navigate('LoanStatusDetails', { type: 'sma', smaLevel: 1, assignedTo: 'me' })}
            style={{ width: '32%', marginLeft: spacing.sm }}
          />
          <StatCard
            icon="alert-circle"
            label="SMA 2"
            value={getSMALevelData(2).count}
            tone="danger"
            onPress={() => navigation.navigate('LoanStatusDetails', { type: 'sma', smaLevel: 2, assignedTo: 'me' })}
            style={{ width: '32%', marginLeft: spacing.sm }}
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sectionGap: {
    marginTop: spacing.xl,
  },
});

export default HomeScreen;
