import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useHomeContext } from '../../../components/context/HomeContext';
import { apiCall } from '../../../components/api/apiUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

// Skeleton loader component
const Skeleton = ({ width, height }) => (
    <View style={[styles.skeleton, { width, height }]} />
);

const HomeScreen = () => {
    const { user } = useHomeContext();
    const [loanCount, setLoanCount] = useState(0);
    const [customerCount, setCustomerCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const navigation = useNavigation();
   
    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [loanCountRes, customerCountRes] = await Promise.all([
                apiCall('/api/employee/loan/collection/today/count', 'GET'),
                apiCall('/api/admin/customer/count/total', 'GET')
            ]);
            setLoanCount(loanCountRes.count);
            setCustomerCount(customerCountRes.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData().then(() => setRefreshing(false));
    };

    const handleCustomerClick = () => {
        navigation.navigate('AllCustomerView');
    };

    const DashboardCard = ({ title, value, icon, onClick }) => (
        <TouchableOpacity style={styles.card} onPress={onClick}>
            <Icon name={icon} size={40} color="#007AFF" />
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardValue}>{value}</Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <Text style={styles.welcome}>Welcome, {user?.fname || 'Admin'}!</Text>

            <View style={styles.dashboardContainer}>
                {loading ? (
                    // Show skeleton loaders when data is still loading
                    <>
                        <Skeleton width="48%" height={120} />
                        <Skeleton width="48%" height={120} />
                    </>
                ) : (
                    <>
                        <DashboardCard title="Today's Collections" value={loanCount} icon="account-details" onClick={() => navigation.navigate('TodaysCollectionScreen')} />
                        <DashboardCard title="Customers" value={customerCount} icon="account-group" onClick={handleCustomerClick} />
                    </>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    skeleton: {
        backgroundColor: '#E0E0E0',
        borderRadius: 10,
        marginBottom: 15,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    welcome: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: 'black',
    },
    dashboardContainer: {
        flexDirection: 'row',
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
});

export default HomeScreen;
