import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from '../../../components/api/apiUtils';
import { useNavigation } from '@react-navigation/native';
import ProfilePicturePlaceHolder from '../../../assets/placeholders/profile.jpg';
import Toast from 'react-native-toast-message';

const AllCustomerView = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const navigation = useNavigation();

    const fetchCustomers = async (pageNumber) => {
        if (loading || !hasMore) return;
        setLoading(true);
        try {
            const response = await apiCall(`/api/admin/customer?page=${pageNumber}&limit=10`, 'GET');
            if (response.status === 'success') {
                if (pageNumber === 1) {
                    setCustomers(response.data);
                } else {
                    setCustomers(prevCustomers => [...prevCustomers, ...response.data]);
                }
                setHasMore(response.data.length === 10);
                setPage(pageNumber);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to fetch customers',
                });
            }
        } catch (error) {
            console.error(error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'An unexpected error occurred',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers(1);
    }, []);

    const renderLoanItem = (loan) => (
        <View style={styles.loanItem} key={loan._id}>
            <View style={styles.loanHeader}>
                <Text style={styles.loanNumber}>Loan #{loan.loanNumber}</Text>
                <View style={[styles.loanStatus, { backgroundColor: getLoanStatusColor(loan.status) }]}>
                    <Text style={styles.loanStatusText}>{loan.status}</Text>
                </View>
            </View>
            <View style={styles.loanDetails}>
                <Text style={styles.loanAmount}>
                    <Icon name="currency-inr" size={14} color="#4CAF50" /> {loan.loanAmount}
                </Text>
                <Text style={styles.loanDuration}>
                    <Icon name="calendar-range" size={14} color="#2196F3" /> {loan.loanDuration}
                </Text>
            </View>
            <Text style={styles.loanAssignee}>
                <Icon name="account" size={14} color="#666" /> {loan.assignedTo.fname} {loan.assignedTo.lname}
            </Text>
        </View>
    );

    const renderCustomerItem = ({ item }) => (
        <TouchableOpacity
            style={styles.customerItem}
            onPress={() => navigation.navigate('CustomerView', { uid: item.uid })}
        >
            <View style={styles.customerHeader}>
                <Image
                    source={item.profilePic ? { uri: item.profilePic } : ProfilePicturePlaceHolder}
                    style={styles.profilePicture}
                />
                <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{`${item.fname} ${item.lname}`}</Text>
                    <Text style={styles.customerPhone}>
                        <Icon name="phone" size={14} color="#666" /> {item.phoneNumber}
                    </Text>
                    <Text style={styles.customerAddress}>
                        <Icon name="map-marker" size={14} color="#666" /> {item.address}, {item.city}
                    </Text>
                </View>
                <Icon name="chevron-right" size={24} color="#999" style={styles.chevron} />
            </View>
            {item.loans && item.loans.length > 0 && (
                <View style={styles.loansContainer}>
                    {item.loans.map(renderLoanItem)}
                </View>
            )}
        </TouchableOpacity>
    );

    const getLoanStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'active':
                return '#4CAF50';
            case 'pending':
                return '#FFC107';
            case 'completed':
                return '#2196F3';
            default:
                return '#9E9E9E';
        }
    };

    const renderFooter = () => {
        if (!loading) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color="#0000ff" />
            </View>
        );
    };

    const handleLoadMore = () => {
        if (hasMore && !loading) {
            fetchCustomers(page + 1);
        }
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={customers}
                renderItem={renderCustomerItem}
                keyExtractor={item => item._id}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.1}
                ListFooterComponent={renderFooter}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    listContent: {
        paddingVertical: 12,
    },
    customerItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    customerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    profilePicture: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
    },
    customerInfo: {
        flex: 1,
    },
    customerName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#333',
    },
    customerPhone: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    customerAddress: {
        fontSize: 14,
        color: '#666',
    },
    chevron: {
        marginLeft: 8,
    },
    loansContainer: {
        padding: 16,
        backgroundColor: '#F5F7FA',
    },
    loanItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    loanHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    loanNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    loanStatus: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    loanStatusText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    loanDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    loanAmount: {
        fontSize: 14,
        color: '#4CAF50',
    },
    loanDuration: {
        fontSize: 14,
        color: '#2196F3',
    },
    loanAssignee: {
        fontSize: 14,
        color: '#666',
    },
    footer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});

export default AllCustomerView;