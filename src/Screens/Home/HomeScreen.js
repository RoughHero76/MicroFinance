import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ImageBackground } from 'react-native';
import { useHomeContext } from '../../components/context/HomeContext';
import { apiCall } from '../../components/api/apiUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { showToast, CustomToast } from '../../components/toast/CustomToast';
import EVILogo from '../../assets/EviLogo.png';

// Skeleton loader components
const Skeleton = ({ width, height }) => (
    <View style={[styles.skeleton, { width, height }]} />
);


const HomeScreen = () => {
    const { user } = useHomeContext();
    const [dashboardData, setDashboardData] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const navigation = useNavigation();

    const fetchDashboardData = useCallback(async () => {
        try {

            setLoading(true);
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
        <TouchableOpacity style={styles.card} onPress={onClick}>
            <Icon name={icon} size={40} color="#007AFF" />
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardValue}>{value}</Text>
        </TouchableOpacity>
    ), []);

    const CustomerCard = useCallback(({ customer }) => (
        <TouchableOpacity
            style={styles.customerCard}
            onPress={() => navigation.navigate('CustomerView', { uid: customer.uid })}
        >
            <Text style={styles.customerName}>{`${customer.fname} ${customer.lname}`}</Text>
            <Text style={styles.customerDetail}>{`Loans: ${customer.loans.length}`}</Text>
            {customer.loans.length > 0 && (
                <Text style={styles.customerDetail}>
                    {`Latest Loan: ${customer.loans[0].loanAmount} (${customer.loans[0].status})`}
                </Text>
            )}
        </TouchableOpacity>
    ), [navigation]);

    const dashboardCards = useMemo(() => {
        if (!dashboardData) return null;
        return (
            <>
                <DashboardCard title="Active Loans" value={dashboardData.loanCount} icon="bank" onClick={() => navigation.navigate('LoansView')} />
                <DashboardCard title="Customers" value={dashboardData.customerCount} icon="account-group" onClick={handleCustomerClick} />
                {/*                 <DashboardCard
                    title="Market Amount"
                    value={`${dashboardData.marketDetails.totalMarketAmount.toLocaleString()}`}
                    icon="cash"
                />
                <DashboardCard
                    title="Repaid"
                    value={`${dashboardData.marketDetails.totalMarketAmountRepaid.toLocaleString()}`}
                    icon="cash-check"
                /> */}
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
                    <Skeleton width="48%" height={150} />
                    <Skeleton width="48%" height={150} />
                    <Skeleton width="48%" height={150} />
                    <Skeleton width="48%" height={150} />

                </View>

                <Text style={styles.sectionTitle}>Recent Customers</Text>
                {/* Skeleton loaders for recent customers */}
                <Skeleton width="100%" height={80} />
                <Skeleton width="100%" height={80} />
                <Skeleton width="100%" height={80} />
                <Skeleton width="100%" height={50} />
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
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <Text style={styles.welcome}>Welcome, {user?.fname || 'Admin'}!</Text>

                <View style={styles.dashboardContainer}>
                    {dashboardCards}
                </View>

                <Text style={styles.sectionTitle}>Recent Customers</Text>
                {dashboardData?.recentCustomers.map((customer) => (
                    <CustomerCard key={customer.uid} customer={customer} />
                ))}

                <TouchableOpacity style={styles.viewAllButton} onPress={() => navigation.navigate('AllCustomerView')}>
                    <Text style={styles.viewAllButtonText}>View All Customers</Text>
                </TouchableOpacity>

                <CustomToast />
            </ScrollView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
    },
    container: {
        flex: 1,
        backgroundColor: 'rgba(245, 245, 245, 0.55)', // Semi-transparent background
        padding: 20,
    },
    skeleton: {
        backgroundColor: '#e0e0e0',
        borderRadius: 8,
        marginBottom: 15,
    },
    welcome: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: 'black',
    },
    dashboardContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    card: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
        elevation: 4,
    },
    cardTitle: {
        fontSize: 16,
        color: '#666',
        marginTop: 10,
    },
    cardValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        color: 'black',
    },
    customerCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
        elevation: 4,
    },
    customerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    customerDetail: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    viewAllButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    viewAllButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default HomeScreen;
