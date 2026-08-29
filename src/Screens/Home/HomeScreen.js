import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ImageBackground } from 'react-native';
import { useHomeContext } from '../../components/context/HomeContext';
import { apiCall } from '../../components/api/apiUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { showToast, CustomToast } from '../../components/toast/CustomToast';
import EVILogo from '../../assets/EviLogo.png';
import { colors, spacing, radii, type } from '../../theme/tokens';
import EviCard from '../../components/ui/EviCard';
import EviButton from '../../components/ui/EviButton';
import Skeleton from '../../components/ui/Skeleton';

const HomeScreen = () => {
    const { user } = useHomeContext();
    const [dashboardData, setDashboardData] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const navigation = useNavigation();

    const fetchDashboardData = useCallback(async () => {

        setLoading(true);
        try {
            const response = await apiCall('/api/admin/dashboard', 'GET');
            if (response.status === 'success') {
                setDashboardData(response.data);
            } else {
                throw new Error('Failed to fetch dashboard data');
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDashboardData().then(() => setRefreshing(false));
    }, [fetchDashboardData]);

    const handleCustomerClick = useCallback(() => {
        navigation.navigate('AllCustomerView');
    }, [navigation]);

    const DashboardCard = useCallback(({ title, value, icon, onClick }) => (
        <EviCard style={styles.card} onPress={onClick}>
            <Icon name={icon} size={40} color={colors.brand} />
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardValue}>{value}</Text>
        </EviCard>
    ), []);

    const CustomerCard = useCallback(({ customer }) => (
        <EviCard
            style={styles.customerCard}
            onPress={() => navigation.navigate('CustomerView', { uid: customer.uid })}
        >
            <Text style={styles.customerName}>{`${customer.fname} ${customer.lname}`}</Text>
            <Text style={styles.customerDetail}>{`Loans: ${customer.loans?.length ?? 0}`}</Text>
            {customer.loans?.length > 0 && (
                <Text style={styles.customerDetail}>
                    {`Latest Loan: ${customer.loans[0].loanAmount} (${customer.loans[0].status})`}
                </Text>
            )}
        </EviCard>
    ), [navigation]);

    const dashboardCards = useMemo(() => {
        if (!dashboardData) return null;
        return (
            <>
                <DashboardCard title="Active Loans" value={dashboardData.loanCount} icon="bank" onClick={() => navigation.navigate('LoansView')} />
                <DashboardCard title="Customers" value={dashboardData.customerCount} icon="account-group" onClick={handleCustomerClick} />
                {/*<DashboardCard
                    title="Market Amount"
                    value={`${dashboardData.marketDetails.totalMarketAmount.toLocaleString()}`}
                    icon="cash"
                />
                <DashboardCard
                    title="Repaid"
                    value={`${dashboardData.marketDetails.totalMarketAmountRepaid.toLocaleString()}`}
                    icon="cash-check"
                />*/}
                <DashboardCard
                    title="Approve History"
                    icon="check-underline"
                    onClick={() => navigation.navigate('RepaymentApprovalScreen')}
                />
                <DashboardCard
                    title="NPA Report"
                    icon="chart-bar"
                    onClick={() => navigation.navigate('NpaReportScreen')}
                />
                <DashboardCard
                    title="Leads"
                    value={dashboardData.newLeads}
                    icon="lead-pencil"
                    onClick={() => navigation.navigate('AdminLeadsScreen')}
                />
            </>
        );
    }, [dashboardData, DashboardCard, handleCustomerClick, navigation]);

    if (loading) {
        // Show skeleton loader during data fetching
        return (
            <ScrollView style={styles.container}>
                <Text style={styles.welcome}>Welcome, {user?.fname || 'Admin'}!</Text>

                <View style={styles.dashboardContainer}>
                    {/* Skeleton loaders that match the shape of dashboard cards */}
                    <Skeleton width="48%" height={150} radius={radii.lg} style={styles.skeletonItem} />
                    <Skeleton width="48%" height={150} radius={radii.lg} style={styles.skeletonItem} />
                    <Skeleton width="48%" height={150} radius={radii.lg} style={styles.skeletonItem} />
                    <Skeleton width="48%" height={150} radius={radii.lg} style={styles.skeletonItem} />

                </View>

                <Text style={styles.sectionTitle}>Recent Customers</Text>
                {/* Skeleton loaders for recent customers */}
                <Skeleton width="100%" height={80} radius={radii.lg} style={styles.skeletonItem} />
                <Skeleton width="100%" height={80} radius={radii.lg} style={styles.skeletonItem} />
                <Skeleton width="100%" height={80} radius={radii.lg} style={styles.skeletonItem} />
                <Skeleton width="100%" height={50} radius={radii.lg} style={styles.skeletonItem} />
            </ScrollView>
        );
    }

    return (
        <ImageBackground
            source={EVILogo}
            style={styles.backgroundImage}
            resizeMode="contain"
        >
            <ScrollView
                style={styles.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
                }
            >
                <Text style={styles.welcome}>Welcome, {user?.fname || 'Admin'}!</Text>

                <View style={styles.dashboardContainer}>
                    {dashboardCards}
                </View>

                <Text style={styles.sectionTitle}>Recent Customers</Text>
                {dashboardData?.recentCustomers?.map((customer) => (
                    <CustomerCard key={customer.uid} customer={customer} />
                ))}

                <EviButton
                    title="View All Customers"
                    icon="arrow-right"
                    fullWidth
                    onPress={() => navigation.navigate('AllCustomerView')}
                    style={styles.viewAllButton}
                />

                <CustomToast />
            </ScrollView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        backgroundColor: colors.surface,
    },
    container: {
        flex: 1,
        backgroundColor: colors.surface,
        padding: spacing.xl,
    },
    skeletonItem: {
        marginBottom: spacing.lg,
    },
    welcome: {
        fontSize: type.sizes.xxl,
        fontWeight: type.weights.bold,
        marginBottom: spacing.xl,
        color: colors.ink,
    },
    dashboardContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    card: {
        width: '48%',
        marginBottom: spacing.lg,
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: type.sizes.md,
        color: colors.inkSoft,
        marginTop: spacing.md,
        fontWeight: type.weights.medium,
    },
    cardValue: {
        fontSize: type.sizes.xxl,
        fontWeight: type.weights.bold,
        color: colors.brand,
    },
    sectionTitle: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.bold,
        marginTop: spacing.xl,
        marginBottom: spacing.md,
        color: colors.ink,
    },
    customerCard: {
        marginBottom: spacing.md,
    },
    customerName: {
        fontSize: type.sizes.lg,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    customerDetail: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginTop: spacing.xs,
    },
    viewAllButton: {
        marginTop: spacing.xl,
        marginBottom: spacing.xxl,
    },
});

export default HomeScreen;
