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
                            <View style={[styles.trendBadge, { backgroundColor: trend > 0 ? '#FF5252' : '#4CAF50' }]}>
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
                        color="#2196F3"
                    />
                    <MetricCard
                        title="NPA Percentage"
                        value={npaPercentage}
                        subtitle={`${getSafeValue(data, 'overall.totalNPA', 0)} NPAs`}
                        color="#FF5252"
                        isPercentage
                    />
                    <MetricCard
                        title="Total Overdue"
                        value={`₹${(totalOverdue / 1000).toFixed(1)}K`}
                        subtitle="Outstanding Amount"
                        color="#FFC107"
                    />
                    <MetricCard
                        title="Average Overdue"
                        value={`₹${(averageOverdue / 1000).toFixed(1)}K`}
                        subtitle="Per Loan"
                        color="#4CAF50"
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

                <TouchableOpacity
                    style={styles.npaCardWrapper}
                    onPress={() => navigation.navigate('LoanStatusDetails', { type: 'npa' })}
                >
                    <LinearGradient
                        colors={['#F44336' + '60', '#EF5350' + '05']}
                        style={styles.npaCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.loanNumberBadge}>
                            <Text style={styles.loanNumberText}>{totalNPA}</Text>
                        </View>
                        <View style={styles.npaHeaderRow}>
                            <Text style={styles.npaTitle}>NPA Accounts</Text>
                            <View style={[styles.npaBadge, { backgroundColor: '#F44336' }]}>
                                <Icon name="alert-decagram" size={14} color="white" />
                                <Text style={styles.npaBadgeText}>Critical</Text>
                            </View>
                        </View>
                        <View style={styles.npaContent}>
                            <View style={styles.npaRow}>
                                <Icon name="percent" size={16} color="#F44336" />
                                <Text style={[styles.npaPercentage, { color: '#F44336' }]}>
                                    {npaPercentage}%
                                </Text>
                            </View>
                            <View style={styles.npaRow}>
                                <Icon name="currency-inr" size={16} color="#F44336" />
                                <Text style={[styles.npaOverdue, { color: '#F44336' }]}>
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
                    color: '#FFC107',
                    label: 'Warning',
                    gradient: ['#FFC107', '#FFE082']
                };
            case 1:
                return {
                    icon: 'alert-octagon-outline',
                    color: '#FF9800',
                    label: 'Alert',
                    gradient: ['#FF9800', '#FFB74D']
                };
            case 2:
                return {
                    icon: 'alert-octagram',
                    color: '#FF5252',
                    label: 'Danger',
                    gradient: ['#FF5252', '#FF8A80']
                };
            default:
                return {
                    icon: 'alert-circle',
                    color: '#757575',
                    label: 'Unknown',
                    gradient: ['#757575', '#BDBDBD']
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
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Loading report...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="alert-circle-outline" size={48} color="#FF5252" />
                <Text style={styles.errorTitle}>Error Loading Data</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={fetchData}
                >
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={fetchData} />
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
        backgroundColor: '#F5F7FA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F7FA',
    },
    loadingText: {
        marginTop: 12,
        color: '#2196F3',
        fontSize: 16,
    },
    sectionContainer: {
        padding: 20,
        backgroundColor: 'white',
        marginBottom: 12,
        borderRadius: 16,
        margin: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#263238',
        marginBottom: 16,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    metricCard: {
        width: '48%',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    metricContent: {
        padding: 16,
        borderLeftWidth: 4,
    },
    metricTitle: {
        fontSize: 14,
        color: '#37474F',
        marginBottom: 8,
        fontWeight: '600',
    },
    metricValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metricValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    metricSubtitle: {
        fontSize: 12,
        color: '#78909C',
        marginTop: 4,
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    trendText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    npaCardWrapper: {
        width: '100%',
        marginBottom: 16,
    },
    npaCard: {
        borderRadius: 16,
        padding: 16,
        position: 'relative',
    },
    npaHeaderRow: {
        flexDirection: 'column',
        marginBottom: 12,
    },
    npaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    npaBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    npaContent: {
        marginTop: 8,
    },
    npaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    npaTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#263238',
    },
    npaPercentage: {
        fontSize: 16,
        marginLeft: 8,
        fontWeight: '600',
    },
    npaOverdue: {
        fontSize: 16,
        marginLeft: 8,
        fontWeight: '600',
    },
    smaDetailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    smaCardWrapper: {
        width: '31%',
        marginBottom: 12,
    },
    smaCard: {
        borderRadius: 16,
        padding: 12,
        height: 160,
        position: 'relative',
    },
    loanNumberBadge: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#2196F3',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    loanNumberText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    smaHeaderRow: {
        flexDirection: 'column',
        marginBottom: 12,
    },
    smaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    smaBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    smaContent: {
        marginTop: 8,
    },
    smaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    smaTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#263238',
    },
    smaPercentage: {
        fontSize: 14,
        marginLeft: 8,
        fontWeight: '600',
    },
    smaOverdue: {
        fontSize: 14,
        marginLeft: 8,
        fontWeight: '600',
    },
    totalLoansContext: {
        fontSize: 14,
        color: '#78909C',
        marginBottom: 16,
        fontStyle: 'italic',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F5F7FA',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FF5252',
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        color: '#78909C',
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#2196F3',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        elevation: 2,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default NpaReportScreen;