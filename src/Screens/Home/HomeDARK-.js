import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { useHomeContext } from '../../components/context/HomeContext';
import { apiCall } from '../../components/api/apiUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { showToast, CustomToast } from '../../components/toast/CustomToast';
import { LineChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

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
            showToast('error', 'Error', 'Failed to fetch dashboard data');
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
            <Icon name={icon} size={30} color="#10B981" />
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

    const lineChartData = useMemo(() => {
        if (!dashboardData) return null;
        return {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            datasets: [
                {
                    data: [
                        Math.random() * 100,
                        Math.random() * 100,
                        Math.random() * 100,
                        Math.random() * 100,
                        Math.random() * 100,
                        dashboardData.marketDetails.totalMarketAmount / 1000,
                    ],
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Tailwind green-500
                    strokeWidth: 2
                }
            ],
        };
    }, [dashboardData]);

    const pieChartData = useMemo(() => {
        if (!dashboardData) return null;
        const totalAmount = dashboardData.marketDetails.totalMarketAmount;
        const repaidAmount = dashboardData.marketDetails.totalMarketAmountRepaid;
        return [
            {
                name: "Repaid",
                population: repaidAmount,
                color: "#10B981",
                legendFontColor: "#F3F4F6",
                legendFontSize: 15
            },
            {
                name: "Outstanding",
                population: totalAmount - repaidAmount,
                color: "#3B82F6",
                legendFontColor: "#F3F4F6",
                legendFontSize: 15
            }
        ];
    }, [dashboardData]);

    const chartConfig = {
        backgroundGradientFrom: "#374151",
        backgroundGradientTo: "#374151",
        decimalPlaces: 2,
        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        style: {
            borderRadius: 16
        },
        propsForDots: {
            r: "6",
            strokeWidth: "2",
            stroke: "#10B981"
        }
    };

    if (loading) {
        return (
            <ScrollView style={styles.container}>
                <Text style={styles.welcome}>Welcome, {user?.fname || 'Admin'}!</Text>
                <View style={styles.dashboardContainer}>
                    <Skeleton width="48%" height={100} />
                    <Skeleton width="48%" height={100} />
                    <Skeleton width="48%" height={100} />
                    <Skeleton width="48%" height={100} />
                </View>
                <Skeleton width={width - 40} height={220} />
                <Skeleton width={width - 40} height={220} />
                <Text style={styles.sectionTitle}>Recent Customers</Text>
                <Skeleton width="100%" height={80} />
                <Skeleton width="100%" height={80} />
                <Skeleton width="100%" height={80} />
                <Skeleton width="100%" height={50} />
            </ScrollView>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <Text style={styles.welcome}>Welcome, {user?.fname || 'Admin'}!</Text>

            <View style={styles.dashboardContainer}>
                <DashboardCard title="Active Loans" value={dashboardData.loanCount} icon="bank" />
                <DashboardCard title="Customers" value={dashboardData.customerCount} icon="account-group" onClick={handleCustomerClick} />
                <DashboardCard
                    title="Market Amount"
                    value={`${dashboardData.marketDetails.totalMarketAmount.toLocaleString()}`}
                    icon="cash"
                />
                <DashboardCard
                    title="Repaid"
                    value={`${dashboardData.marketDetails.totalMarketAmountRepaid.toLocaleString()}`}
                    icon="cash-check"
                />
            </View>

            <Text style={styles.sectionTitle}>Market Trend</Text>
            <LineChart
                data={lineChartData}
                width={width - 40}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
            />

            <Text style={styles.sectionTitle}>Repayment Status</Text>
            <PieChart
                data={pieChartData}
                width={width - 40}
                height={220}
                chartConfig={chartConfig}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[10, 10]}
                absolute
                style={styles.chart}
            />

            <Text style={styles.sectionTitle}>Recent Customers</Text>
            {dashboardData?.recentCustomers.map((customer) => (
                <CustomerCard key={customer.uid} customer={customer} />
            ))}

            <TouchableOpacity style={styles.viewAllButton} onPress={() => navigation.navigate('AllCustomerView')}>
                <Text style={styles.viewAllButtonText}>View All Customers</Text>
            </TouchableOpacity>

            <CustomToast />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1F2937',
        padding: 20,
    },
    skeleton: {
        backgroundColor: '#374151',
        borderRadius: 8,
        marginBottom: 15,
    },
    welcome: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#F3F4F6',
    },
    dashboardContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    card: {
        width: '48%',
        backgroundColor: '#374151',
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
        fontSize: 14,
        color: '#D1D5DB',
        marginTop: 10,
    },
    cardValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F3F4F6',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        color: '#F3F4F6',
    },
    customerCard: {
        backgroundColor: '#374151',
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
        color: '#10B981',
    },
    customerDetail: {
        fontSize: 14,
        color: '#D1D5DB',
        marginTop: 5,
    },
    viewAllButton: {
        backgroundColor: '#10B981',
        padding: 15,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    viewAllButtonText: {
        color: '#F3F4F6',
        fontSize: 16,
        fontWeight: 'bold',
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
});

export default HomeScreen;