import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useHomeContext } from '../../components/context/HomeContext';
import { apiCall } from '../../components/api/apiUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';



const HomeScreen = () => {
    const { user } = useHomeContext();
    const [loanCount, setLoanCount] = useState(0);
    const [marketDetails, setMarketDetails] = useState({ totalMarketAmmount: 0, totalMarketAmmountRepaid: 0 });
    const [customerCount, setCustomerCount] = useState(0);
    const [recentCustomers, setRecentCustomers] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);


    const navigation = useNavigation();
    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [loanCountRes, marketDetailsRes, customerCountRes, customersRes] = await Promise.all([
                apiCall('/api/admin/loan/count/total', 'GET'),
                apiCall('/api/admin/loan/count/market/details', 'GET'),
                apiCall('/api/admin/customer/count/total', 'GET'),
                apiCall('/api/admin/customer', 'GET')
            ]);

            setLoanCount(loanCountRes.count);
            setMarketDetails(marketDetailsRes.data);
            setCustomerCount(customerCountRes.data);

            setRecentCustomers(customersRes.data.slice(0, 5));
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchDashboardData().then(() => setRefreshing(false));
    }, []);

    const handleCustomerClick = () => {

        navigation.navigate('AllCustomerView');

    }


    const DashboardCard = ({ title, value, icon, onClick }) => (
        <TouchableOpacity style={styles.card} onPress={onClick}>
            <Icon name={icon} size={40} color="#007AFF" />
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardValue}>{value}</Text>
        </TouchableOpacity>
    );

    const CustomerCard = ({ customer }) => (
        <TouchableOpacity
            style={styles.customerCard}
            onPress={() => navigation.navigate('CustomerView', { uid: customer.uid })} // Navigate to CustomerView with uid
        >
            <Text style={styles.customerName}>{`${customer.fname} ${customer.lname}`}</Text>
            <Text style={styles.customerDetail}>{`Loans: ${customer.loans.length}`}</Text>
            {customer.loans.length > 0 && (
                <Text style={styles.customerDetail}>
                    {`Latest Loan: ${customer.loans[0].loanAmount} (${customer.loans[0].status})`}
                </Text>
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading dashboard data...</Text>
            </View>
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
                <DashboardCard title="Active Loans" value={loanCount} icon="bank" />
                <DashboardCard title="Customers" value={customerCount} icon="account-group" onClick={handleCustomerClick} />
                <DashboardCard
                    title="Market Amount"
                    value={`${marketDetails.totalMarketAmmount.toLocaleString()}`}
                    icon="cash"
                />
                <DashboardCard
                    title="Repaid"
                    value={`${marketDetails.totalMarketAmmountRepaid.toLocaleString()}`}
                    icon="cash-check"
                />
            </View>

            <Text style={styles.sectionTitle}>Recent Customers</Text>
            {recentCustomers.map((customer) => (
                <CustomerCard key={customer.uid} customer={customer} />
            ))}

            <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllButtonText}>View All Customers</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'black',
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