import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast } from '../../../components/toast/CustomToast';
import CustomToast from '../../../components/toast/CustomToast';
import Screen from '../../../design/components/Screen';
import Card from '../../../design/components/Card';
import Button from '../../../design/components/Button';
import StatCard from '../../../design/components/StatCard';
import EmptyState from '../../../design/components/EmptyState';
import Skeleton from '../../../design/components/Skeleton';
import Icon from '../../../design/Icon';
import { FadeInUp } from '../../../design/motion';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * NpaReportScreen (NPA / SMA risk report) — rebuilt on the "Ink & Amber"
 * design system.
 *  - behaviour preserved 1:1: the same /api/shared/loan/status/statistics
 *    fetch + structure validation, the /api/shared/loan/statuses/update
 *    refresh action, navigation to LoanStatusDetails ({type:'npa'} and
 *    {type:'sma', smaLevel}), pull-to-refresh, retry-on-error
 *  - every toast keeps its original argument count and message
 *  - missing icon names from the old build (alert-decagram,
 *    alert-octagon-outline, alert-octagram) are mapped to verified design
 *    icons (alert-decagon, alert-triangle, alert-circle)
 *  - design: gradient hero cards become flat surface cards with semantic
 *    icon chips and a StatCard overview grid; skeletons while loading and a
 *    proper EmptyState + Retry on failure; the pull-to-refresh spinner now
 *    actually shows (refreshing was reset in the old code but never set)
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

const LoadingReport = () => (
  <View style={styles.page}>
    <SectionLabel>NPA Analysis</SectionLabel>
    <Skeleton width="100%" height={120} radius={radius.lg} />
    <View style={{ height: spacing.xl }} />
    <SectionLabel>SMA Analysis</SectionLabel>
    <View style={styles.grid}>
      <Skeleton width="31%" height={110} radius={radius.lg} />
      <Skeleton width="31%" height={110} radius={radius.lg} style={{ marginLeft: spacing.sm }} />
      <Skeleton width="31%" height={110} radius={radius.lg} style={{ marginLeft: spacing.sm }} />
    </View>
    <View style={{ height: spacing.xl }} />
    <SectionLabel>Overview</SectionLabel>
    <View style={styles.grid}>
      <Skeleton width="48%" height={92} radius={radius.lg} />
      <Skeleton width="48%" height={92} radius={radius.lg} style={{ marginLeft: spacing.md }} />
      <Skeleton width="48%" height={92} radius={radius.lg} style={{ marginTop: spacing.md }} />
      <Skeleton width="48%" height={92} radius={radius.lg} style={{ marginLeft: spacing.md, marginTop: spacing.md }} />
    </View>
  </View>
);

const NpaReportScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError(null);
      const response = await apiCall('/api/shared/loan/status/statistics');

      if (!response.error && response.data?.statistics) {
        // Validate required data structure
        if (!validateDataStructure(response.data.statistics)) {
          throw new Error('Invalid data structure received from server');
        }
        setData(response.data.statistics);
      } else {
        throw new Error(response.message || 'Failed to fetch statistics');
      }
    } catch (error) {
      setError(error.message);
      showToast('error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Validate the data structure
  const validateDataStructure = (statistics) => {
    if (!statistics.overall || !statistics.smaLevels) {
      return false;
    }

    const requiredOverallFields = ['totalLoans', 'totalNPA', 'npaPercentage', 'totalOverdue'];

    return requiredOverallFields.every(
      (field) => statistics.overall[field] !== undefined && statistics.overall[field] !== null
    );
  };

  const handleLOanStatusRefresh = async () => {
    try {
      const response = await apiCall('/api/shared/loan/statuses/update');
      if (response.status === 'success') {
        showToast('success', 'Loan statuses updated successfully');
      } else {
        showToast('error', response.message || 'Failed to update loan statuses');
      }
    } catch (error) {
      showToast('error', error.message || 'Failed to update loan statuses');
    }
  };

  // Safe getter for nested values with fallback
  const getSafeValue = (obj, path, fallback = '0') => {
    try {
      return path.split('.').reduce((acc, part) => acc[part], obj) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const formatK = (value) => `₹${(Number(value || 0) / 1000).toFixed(1)}K`;

  const getSMAConfig = (level) => {
    switch (level) {
      case 0:
        return { icon: 'alert-circle-outline', bg: colors.warningSoft, fg: colors.warningInk };
      case 1:
        return { icon: 'alert-triangle', bg: colors.warningSoft, fg: colors.warningInk };
      case 2:
        return { icon: 'alert-circle', bg: colors.dangerSoft, fg: colors.dangerInk };
      case null: // NPA
        return { icon: 'alert-decagon', bg: colors.dangerSoft, fg: colors.dangerInk };
      default:
        return { icon: 'alert-circle', bg: colors.neutralSoft, fg: colors.neutralInk };
    }
  };

  const SmaCard = ({ level, count, percentage, overdue, onPress }) => {
    const config = getSMAConfig(level);
    return (
      <Card tone="surface" elevation="subtle" onPress={onPress} style={{ width: '31%', marginBottom: spacing.md }}>
        <View style={{ padding: spacing.md, alignItems: 'flex-start', gap: spacing.xs }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: radius.md,
              backgroundColor: config.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={config.icon} size={18} color={config.fg} />
          </View>
          <Text style={[type.sub, { color: colors.inkSecondary, fontWeight: '600' }]} numberOfLines={1}>
            SMA {level}
          </Text>
          <Text style={[type.h2, { color: colors.ink }]} numberOfLines={1}>
            {count}
          </Text>
          <Text style={[type.micro, { color: colors.inkMuted }]} numberOfLines={1}>
            {percentage}% · {formatK(overdue)}
          </Text>
        </View>
      </Card>
    );
  };

  const renderNPAAnalysis = () => {
    if (!data?.overall) return null;

    const totalNPA = getSafeValue(data, 'overall.totalNPA', 0);
    const npaPercentage = getSafeValue(data, 'overall.npaPercentage', 0);
    const totalOverdue = getSafeValue(data, 'overall.totalOverdue', 0);

    return (
      <View>
        <View style={styles.npaHeader}>
          <SectionLabel>NPA Analysis</SectionLabel>
          <Button
            label="Refresh"
            icon="refresh"
            variant="outline"
            size="sm"
            onPress={handleLOanStatusRefresh}
          />
        </View>
        <Text style={styles.contextLine}>
          Showing distribution across {getSafeValue(data, 'overall.totalLoans', 0)} total loans
        </Text>

        <Card
          tone="surface"
          elevation="subtle"
          onPress={() => navigation.navigate('LoanStatusDetails', { type: 'npa' })}
        >
          <View style={styles.npaRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[type.caption, { color: colors.dangerInk, letterSpacing: 0.8 }]}>CRITICAL</Text>
              <Text style={[type.h2, { color: colors.ink }]}>NPA Accounts</Text>
            </View>
            <View style={styles.npaCountChip}>
              <Text style={styles.npaCountText}>{totalNPA}</Text>
            </View>
          </View>

          <View style={styles.npaStats}>
            <View style={styles.npaStatItem}>
              <Icon name="percent" size={16} color={colors.dangerInk} />
              <Text style={styles.npaStatText}>{npaPercentage}%</Text>
              <Text style={styles.npaStatCaption}>of portfolio</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.npaStatItem}>
              <Icon name="currency-inr" size={16} color={colors.dangerInk} />
              <Text style={styles.npaStatText}>{formatK(totalOverdue)}</Text>
              <Text style={styles.npaStatCaption}>overdue</Text>
            </View>
          </View>
        </Card>
      </View>
    );
  };

  const renderSMAAnalysis = () => {
    let levels = null;
    if (data?.smaLevels && Array.isArray(data.smaLevels)) {
      levels = data.smaLevels
        .filter((sma) => sma && typeof sma.level !== 'undefined')
        .sort((a, b) => a.level - b.level);
    }

    return (
      <View style={styles.sectionGap}>
        <SectionLabel>SMA Analysis</SectionLabel>
        {levels && levels.length > 0 ? (
          <>
            <Text style={styles.contextLine}>
              Showing distribution across {getSafeValue(data, 'overall.totalLoans', 0)} total loans
            </Text>
            <View style={styles.grid}>
              {levels.map((sma, i) => (
                <View
                  key={sma.level}
                  style={i === 0 ? null : { marginLeft: spacing.sm, width: '31%' }}
                >
                  <SmaCard
                    level={sma.level}
                    count={getSafeValue(sma, 'count', 0)}
                    percentage={getSafeValue(sma, 'percentage', 0)}
                    overdue={getSafeValue(sma, 'totalOverdue', 0)}
                    onPress={() =>
                      navigation.navigate('LoanStatusDetails', {
                        type: 'sma',
                        smaLevel: sma.level,
                      })
                    }
                  />
                </View>
              ))}
            </View>
          </>
        ) : (
          <Card>
            <Text style={[type.body, { color: colors.inkMuted }]}>No SMA data available</Text>
          </Card>
        )}
      </View>
    );
  };

  const renderOverviewSection = () => {
    if (!data?.overall) return null;

    const totalLoans = getSafeValue(data, 'overall.totalLoans', 0);
    const npaPercentage = getSafeValue(data, 'overall.npaPercentage', 0);
    const totalNPA = getSafeValue(data, 'overall.totalNPA', 0);
    const totalOverdue = getSafeValue(data, 'overall.totalOverdue', 0);
    const averageOverdue = getSafeValue(data, 'monthlyTrend.0.averageOverdue', 0);

    return (
      <View style={styles.sectionGap}>
        <SectionLabel>Overview</SectionLabel>
        <View style={styles.grid}>
          <StatCard icon="bank" label="Active Loans" value={totalLoans} tone="primary" style={{ width: '48%' }} />
          <StatCard
            icon="alert-decagon"
            label={`${totalNPA} NPA ${totalNPA === 1 ? 'account' : 'accounts'}`}
            value={`${npaPercentage}%`}
            tone="danger"
            style={{ width: '48%', marginLeft: spacing.md }}
          />
          <StatCard
            icon="clock-alert-outline"
            label="Total Overdue"
            value={formatK(totalOverdue)}
            tone="warning"
            style={{ width: '48%', marginTop: spacing.md }}
          />
          <StatCard
            icon="percent"
            label="Average Overdue / Loan"
            value={formatK(averageOverdue)}
            tone="success"
            style={{ width: '48%', marginLeft: spacing.md, marginTop: spacing.md }}
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <Screen scroll bg={colors.bg} scrollProps={{ contentContainerStyle: styles.page }}>
        <LoadingReport />
        <CustomToast />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen bg={colors.bg}>
        <EmptyState
          icon="alert-circle-outline"
          title="Error Loading Data"
          subtitle={error}
          action={{ label: 'Retry', icon: 'refresh', variant: 'accent', onPress: fetchData }}
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
        <RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={colors.inkMuted} />
      }
      scrollProps={{ contentContainerStyle: styles.page, showsVerticalScrollIndicator: false }}
    >
      <FadeInUp>{data && renderNPAAnalysis()}</FadeInUp>
      <FadeInUp delay={80}>{data && renderSMAAnalysis()}</FadeInUp>
      <FadeInUp delay={160}>{data && renderOverviewSection()}</FadeInUp>

      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  sectionGap: {
    marginTop: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  contextLine: {
    ...type.sub,
    color: colors.inkMuted,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  npaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  npaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  npaCountChip: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  npaCountText: {
    ...type.bodyBold,
    color: colors.dangerInk,
  },
  npaStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  npaStatItem: {
    flex: 1,
    gap: 2,
  },
  npaStatText: {
    ...type.bodyBold,
    color: colors.ink,
  },
  npaStatCaption: {
    ...type.micro,
    color: colors.inkMuted,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
});

export default NpaReportScreen;
