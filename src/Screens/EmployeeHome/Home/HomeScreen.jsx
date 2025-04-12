import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ImageBackground } from 'react-native';
import { useHomeContext } from '../../../components/context/HomeContext';
import { apiCall } from '../../../components/api/apiUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import EVILogo from '../../../assets/EviLogo.png';

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
    const [statisticsData, setStatisticData] = useState(null);

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
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        Promise.all([fetchDashboardData(), fetchData()]).then(() => setRefreshing(false));
    };

    const handleCustomerClick = () => {
        navigation.navigate('AllCustomerView');
    };

    const handleLeadClick = () => {
        navigation.navigate('LeadListScreen');
    };

    const handleCreateLead = () => {
        navigation.navigate('CreateLeadScreen');
    };

    // Helper function to safely get SMA level data

    const getSMALevelData = (level) => {
        if (!statisticsData?.statistics?.smaLevels) return { count: 0, percentage: "0" };
        const smaData = statisticsData.statistics.smaLevels.find(sma => sma.level === level);
        return smaData || { count: 0, percentage: "0" };
    };

    const DashboardCard = ({ title, value, icon, onClick, color, fullWidth }) => (
        <TouchableOpacity
            style={[
                styles.card,
                fullWidth ? styles.fullWidthCard : styles.halfWidthCard
            ]}
            onPress={onClick}
            disabled={!onClick}
        >
            <Icon name={icon} size={40} color={color || "#007AFF"} />
            <Text style={[styles.cardTitle, color && { color }]}>{title}</Text>
            <Text style={[styles.cardValue, color && { color }]}>{value || 0}</Text>
        </TouchableOpacity>
    );

    const SectionTitle = ({ title }) => (
        <Text style={styles.sectionTitle}>{title}</Text>
    );

    return (
        <ImageBackground
            source={EVILogo}
            style={styles.backgroundImage}
            resizeMode="contain"
        >
            <ScrollView
                style={styles.container}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <Text style={styles.welcome}>Welcome, {user?.fname || 'Admin'}!</Text>

                <View style={styles.dashboardContainer}>
                    {loading ? (

                        <View style={styles.row}>
                            <Skeleton width="48%" height={150} />
                            <Skeleton width="48%" height={150} />
                            <Skeleton width="48%" height={150} />
                            <Skeleton width="48%" height={150} />
                            <Skeleton width="48%" height={150} />
                            <Skeleton width="48%" height={150} />
                        </View>
                    ) : (
                        <>
                            {/* Top Section - Collections and Customers */}
                            <View style={styles.row}>
                                <DashboardCard
                                    title="Today's Collections"
                                    value={loanCount}
                                    icon="account-details"
                                    color="#007AFF"
                                    onClick={() => navigation.navigate('TodaysCollectionScreen')}
                                />
                                <DashboardCard
                                    title="Customers"
                                    value={'N/A'}
                                    icon="account-group"
                                    color="#007AFF"
                                    onClick={handleCustomerClick}
                                />
                            </View>

                            {/* NPA Section */}
                            <SectionTitle title="NPA Loans" />
                            <DashboardCard
                                title="NPA Loans"
                                value={statisticsData?.statistics?.overall?.totalNPA}
                                icon="alert-decagram"
                                color="#F44336"
                                onClick={() => navigation.navigate('LoanStatusDetails', { type: 'npa', assignedTo: 'me' })}
                                fullWidth
                            />

                            {/* SMA Section */}
                            <SectionTitle title="SMA Loans" />
                            <View style={styles.row}>
                                <DashboardCard
                                    title="SMA 0"
                                    value={getSMALevelData(0).count}
                                    icon="alert-circle-outline"
                                    color="#FFC107"
                                    onClick={() => navigation.navigate('LoanStatusDetails', { type: 'sma', smaLevel: 0, assignedTo: 'me' })}
                                />
                                <DashboardCard
                                    title="SMA 1"
                                    value={getSMALevelData(1).count}
                                    icon="alert-octagon-outline"
                                    color="#FF9800"
                                    onClick={() => navigation.navigate('LoanStatusDetails', { type: 'sma', smaLevel: 1, assignedTo: 'me' })}
                                />
                                <DashboardCard
                                    title="SMA 2"
                                    value={getSMALevelData(2).count}
                                    icon="alert-octagram"
                                    color="#F44336"
                                    onClick={() => navigation.navigate('LoanStatusDetails', { type: 'sma', smaLevel: 2, assignedTo: 'me' })}
                                />
                            </View>

                        </>
                    )}
                </View>
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
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    card: {
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
    halfWidthCard: {
        width: '48%',
    },
    fullWidthCard: {
        width: '100%',
    },
    cardTitle: {
        fontSize: 16,
        color: '#666',
        marginTop: 10,
        textAlign: 'center',
    },
    cardValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
        marginBottom: 15,
    }
});

export default HomeScreen;