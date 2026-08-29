import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from "../../../components/api/apiUtils";
import { CustomToast, showToast } from "../../../components/toast/CustomToast";
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, type, radii, shadow } from "../../../theme/tokens";
import ErrorState from "../../../components/ui/ErrorState";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NpaReportScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
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

        const requiredOverallFields = [
            'totalLoans',
            'totalNPA',
            'npaPercentage',
            'totalOverdue'
        ];

        return requiredOverallFields.every(field =>
            statistics.overall[field] !== undefined &&
            statistics.overall[field] !== null
        );
    };

    const handleLOanStatusRefresh = async () => {
        try {
            setLoading(true);
            const response = await apiCall('/api/shared/loan/statuses/update');
            if (response.status === 'success') {
                showToast('success', 'Loan statuses updated successfully');
            } else {
                showToast('error', response.message || 'Failed to update loan statuses');
            }
        } catch (error) {
            showToast('error', error.message || 'Failed to update loan statuses');
        } finally {
            setLoading(false);
        }
    }

    // Safe getter for nested values with fallback
    const getSafeValue = (obj, path, fallback = '0') => {
        try {
            return path.split('.').reduce((acc, part) => acc[part], obj) ?? fallback;
        } catch {
            return fallback;
        }
    };

    const MetricCard = ({ title, value, subtitle, trend, color, isPercentage }) => {
        // Handle undefined or null values
        const displayValue = value ?? (isPercentage ? '0%' : '0');
        const displaySubtitle = subtitle || 'No data available';

        return (
            <LinearGradient
                colors={[color + '15', color + '05']}
                style={styles.metricCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={[styles.metricContent, { borderLeftColor: color }]}>
                    <Text style={styles.metricTitle}>{title}</Text>
                    <View style={styles.metricValueContainer}>
                        <Text style={[styles.metricValue, { color }]}>
                            {displayValue}
                        </Text>
                        {trend !== undefined && trend !== null && (
                            <View style={[styles.trendBadge, { backgroundColor: trend > 0 ? colors.danger : colors.success }]}>
                                <Icon
                                    name={trend > 0 ? 'trending-up' : 'trending-down'}
                                    size={16}
                                    color="white"
                                />
                                <Text style={styles.trendText}>{Math.abs(trend)}%</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.metricSubtitle}>{displaySubtitle}</Text>
                </View>
            </LinearGradient>
        );
    };

    const renderOverviewSection = () => {
        if (!data?.overall) return null;

        const totalLoans = getSafeValue(data, 'overall.totalLoans', 0);
        const npaPercentage = getSafeValue(data, 'overall.npaPercentage', 0);
        const totalOverdue = getSafeValue(data, 'overall.totalOverdue', 0);
        const averageOverdue = getSafeValue(data, 'monthlyTrend.0.averageOverdue', 0);

        return (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.metricsGrid}>
                    <MetricCard
                        title="Total Loans"
                        value={totalLoans}
                        subtitle="Active Loans"
                        color={colors.info}
                    />
                    <MetricCard
                        title="NPA Percentage"
                        value={npaPercentage}
                        subtitle={`${getSafeValue(data, 'overall.totalNPA', 0)} NPAs`}
                        color={colors.danger}
                        isPercentage
                    />
                    <MetricCard
                        title="Total Overdue"
                        value={`₹${(totalOverdue / 1000).toFixed(1)}K`}
                        subtitle="Outstanding Amount"
                        color={colors.warning}
                    />
                    <MetricCard
                        title="Average Overdue"
                        value={`₹${(averageOverdue / 1000).toFixed(1)}K`}
                        subtitle="Per Loan"
                        color={colors.success}
                    />
                </View>
            </View>
        );
    };

    const renderNPAAnalysis = () => {
        if (!data?.overall) return null;

        const totalNPA = getSafeValue(data, 'overall.totalNPA', 0);
        const npaPercentage = getSafeValue(data, 'overall.npaPercentage', 0);
        const totalOverdue = getSafeValue(data, 'overall.totalOverdue', 0);

        return (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>NPA Analysis</Text>
                <Text style={styles.totalLoansContext}>
                    Showing distribution across {getSafeValue(data, 'overall.totalLoans', 0)} total loans
                </Text>

                <View style={styles.npaCardContainer}>
                    <TouchableOpacity style={styles.npaCardWrapper} onPress={handleLOanStatusRefresh}>
                        <Icon name="refresh" size={22} color={colors.ink} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.npaCardWrapper}
                    onPress={() => navigation.navigate('LoanStatusDetails', { type: 'npa' })}
                >
                    <LinearGradient
                        colors={[colors.danger + '60', colors.danger + '05']}
                        style={styles.npaCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.loanNumberBadge}>
                            <Text style={styles.loanNumberText}>{totalNPA}</Text>
                        </View>
                        <View style={styles.npaHeaderRow}>
                            <Text style={styles.npaTitle}>NPA Accounts</Text>
                            <View style={[styles.npaBadge, { backgroundColor: colors.danger }]}>
                                <Icon name="alert-decagram" size={14} color="white" />
                                <Text style={styles.npaBadgeText}>Critical</Text>
                            </View>
                        </View>
                        <View style={styles.npaContent}>
                            <View style={styles.npaRow}>
                                <Icon name="percent" size={16} color={colors.danger} />
                                <Text style={[styles.npaPercentage, { color: colors.danger }]}>
                                    {npaPercentage}%
                                </Text>
                            </View>
                            <View style={styles.npaRow}>
                                <Icon name="currency-inr" size={16} color={colors.danger} />
                                <Text style={[styles.npaOverdue, { color: colors.danger }]}>
                                    {(totalOverdue / 1000).toFixed(1)}K
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    };

    const getSMAConfig = (level) => {
        switch (level) {
            case 0:
                return {
                    icon: 'alert-circle-outline',
                    color: colors.warning,
                    label: 'Warning',
                    gradient: [colors.warning, colors.warningTint]
                };
            case 1:
                return {
                    icon: 'alert-octagon-outline',
                    color: colors.orange,
                    label: 'Alert',
                    gradient: [colors.orange, colors.orangeTint]
                };
            case 2:
                return {
                    icon: 'alert-octagram',
                    color: colors.danger,
                    label: 'Danger',
                    gradient: [colors.danger, colors.dangerTint]
                };

            case null: // NPA
                return {
                    icon: 'alert-decagram',
                    color: colors.danger,
                    label: 'Critical NPA',
                    gradient: [colors.danger, colors.orange]
                }
            default:
                return {
                    icon: 'alert-circle',
                    color: colors.inkFaint,
                    label: 'Unknown',
                    gradient: [colors.inkFaint, colors.line]
                };
        }
    };


    const renderSMAAnalysis = () => {
        if (!data?.smaLevels || !Array.isArray(data.smaLevels)) {
            return (
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>SMA Analysis</Text>
                    <Text style={styles.errorText}>No SMA data available</Text>
                </View>
            );
        }

        const sortedSMALevels = [...data.smaLevels]
            .filter(sma => sma && typeof sma.level !== 'undefined')
            .sort((a, b) => a.level - b.level);

        if (sortedSMALevels.length === 0) {
            return (
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>SMA Analysis</Text>
                    <Text style={styles.errorText}>No valid SMA data found</Text>
                </View>
            );
        }

        return (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>SMA Analysis</Text>
                <Text style={styles.totalLoansContext}>
                    Showing distribution across {getSafeValue(data, 'overall.totalLoans', 0)} total loans
                </Text>

                <View style={styles.smaDetailsGrid}>
                    {sortedSMALevels.map((sma) => {
                        const config = getSMAConfig(sma.level);
                        return (
                            <TouchableOpacity
                                key={sma.level}
                                style={styles.smaCardWrapper}
                                onPress={() => navigation.navigate('LoanStatusDetails', {
                                    type: 'sma',
                                    smaLevel: sma.level
                                })}
                            >
                                <LinearGradient
                                    colors={[config.gradient[0] + '15', config.gradient[1] + '05']}
                                    style={styles.smaCard}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <View style={styles.loanNumberBadge}>
                                        <Text style={styles.loanNumberText}>
                                            {getSafeValue(sma, 'count', 0)}
                                        </Text>
                                    </View>
                                    <View style={styles.smaHeaderRow}>
                                        <Text style={styles.smaTitle}>SMA {sma.level}</Text>
                                        <View style={[styles.smaBadge, { backgroundColor: config.color }]}>
                                            <Icon name={config.icon} size={14} color="white" />
                                            <Text style={styles.smaBadgeText}>{config.label}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.smaContent}>
                                        <View style={styles.smaRow}>
                                            <Icon name="percent" size={16} color={config.color} />
                                            <Text style={[styles.smaPercentage, { color: config.color }]}>
                                                {getSafeValue(sma, 'percentage', 0)}%
                                            </Text>
                                        </View>
                                        <View style={styles.smaRow}>
                                            <Icon name="currency-inr" size={16} color={config.color} />
                                            <Text style={[styles.smaOverdue, { color: config.color }]}>
                                                {(getSafeValue(sma, 'totalOverdue', 0) / 1000).toFixed(1)}K
                                            </Text>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.brand} />
                <Text style={styles.loadingText}>Loading report...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <ErrorState
                    message={error}
                    retryLabel="Retry"
                    onRetry={fetchData}
                />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={fetchData} colors={[colors.brand]} tintColor={colors.brand} />
            }
        >
            {data && (
                <>
                    {renderNPAAnalysis()}
                    {renderSMAAnalysis()}
                    {renderOverviewSection()}
                </>
            )}
            <CustomToast />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
    },
    loadingText: {
        marginTop: spacing.md,
        color: colors.inkSoft,
        fontSize: type.sizes.md,
    },
    sectionContainer: {
        padding: spacing.xl,
        backgroundColor: colors.card,
        borderRadius: radii.lg,
        margin: spacing.md,
        marginBottom: spacing.md,
        ...shadow.card,
    },
    sectionTitle: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.bold,
        color: colors.ink,
        marginBottom: spacing.lg,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    metricCard: {
        width: '48%',
        borderRadius: radii.lg,
        marginBottom: spacing.lg,
        overflow: 'hidden',
    },
    metricContent: {
        padding: spacing.lg,
        borderLeftWidth: 4,
    },
    metricTitle: {
        fontSize: type.sizes.md,
        color: colors.inkSoft,
        marginBottom: spacing.sm,
        fontWeight: type.weights.semibold,
    },
    metricValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metricValue: {
        fontSize: type.sizes.display,
        fontWeight: type.weights.bold,
    },
    metricSubtitle: {
        fontSize: type.sizes.xs,
        color: colors.inkSoft,
        marginTop: spacing.xs,
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radii.md,
    },
    trendText: {
        color: 'white',
        fontSize: type.sizes.xs,
        fontWeight: type.weights.bold,
        marginLeft: spacing.xs,
    },
    npaCardContainer: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    npaCardWrapper: {
        width: '100%',
        marginBottom: spacing.lg,
    },
    npaCard: {
        borderRadius: radii.lg,
        padding: spacing.lg,
        position: 'relative',
    },
    npaHeaderRow: {
        flexDirection: 'column',
        marginBottom: spacing.md,
    },
    npaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radii.pill,
        marginTop: spacing.sm,
        alignSelf: 'flex-start',
    },
    npaBadgeText: {
        color: 'white',
        fontSize: type.sizes.xs,
        fontWeight: type.weights.bold,
        marginLeft: spacing.xs,
    },
    npaContent: {
        marginTop: spacing.sm,
    },
    npaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    npaTitle: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    npaPercentage: {
        fontSize: type.sizes.lg,
        marginLeft: spacing.md,
        fontWeight: type.weights.semibold,
    },
    npaOverdue: {
        fontSize: type.sizes.lg,
        marginLeft: spacing.md,
        fontWeight: type.weights.semibold,
    },
    smaDetailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: spacing.lg,
    },
    smaCardWrapper: {
        width: '31%',
        marginBottom: spacing.md,
    },
    smaCard: {
        borderRadius: radii.lg,
        padding: spacing.md,
        height: 160,
        position: 'relative',
    },
    loanNumberBadge: {
        position: 'absolute',
        top: -spacing.sm,
        right: -spacing.sm,
        backgroundColor: colors.brand,
        borderRadius: radii.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        elevation: 4,
        ...shadow.card,
    },
    loanNumberText: {
        color: 'white',
        fontSize: type.sizes.xs,
        fontWeight: type.weights.bold,
    },
    smaHeaderRow: {
        flexDirection: 'column',
        marginBottom: spacing.md,
    },
    smaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radii.pill,
        marginTop: spacing.sm,
        alignSelf: 'flex-start',
    },
    smaBadgeText: {
        color: 'white',
        fontSize: type.sizes.xs,
        fontWeight: type.weights.bold,
        marginLeft: spacing.xs,
    },
    smaContent: {
        marginTop: spacing.sm,
    },
    smaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    smaTitle: {
        fontSize: type.sizes.lg,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    smaPercentage: {
        fontSize: type.sizes.md,
        marginLeft: spacing.md,
        fontWeight: type.weights.semibold,
    },
    smaOverdue: {
        fontSize: type.sizes.md,
        marginLeft: spacing.md,
        fontWeight: type.weights.semibold,
    },
    totalLoansContext: {
        fontSize: type.sizes.md,
        color: colors.inkSoft,
        marginBottom: spacing.lg,
        fontStyle: 'italic',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
        backgroundColor: colors.surface,
    },
    errorText: {
        fontSize: type.sizes.md,
        color: colors.inkSoft,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
});

export default NpaReportScreen;
