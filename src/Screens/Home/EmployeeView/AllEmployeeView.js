import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from '../../../components/api/apiUtils';
import { useNavigation } from '@react-navigation/native';
import ProfilePicturePlaceHolder from '../../../assets/placeholders/profile.jpg';
import Toast from 'react-native-toast-message';

const AllEmployeeView = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const navigation = useNavigation();


    const fetchEmployees = async (pageNumber) => {
        if (loading || !hasMore) return;
        setLoading(true);
        try {
            const response = await apiCall(`/api/admin/employee?page=${pageNumber}&limit=10`, 'GET');
            if (response.status === 'success') {
                if (pageNumber === 1) {
                    setEmployees(response.data);
                } else {
                    setEmployees(prevEmployees => [...prevEmployees, ...response.data]);
                }
                setHasMore(response.data.length === 10);
                setPage(pageNumber);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to fetch employees',
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
        fetchEmployees(1);
    }, []);

    const renderEmployeeItem = ({ item }) => {
        return (
            <TouchableOpacity
                style={styles.employeeItem}
                onPress={() => navigation.navigate('EmployeeView', { uid: item.uid })}
            >
                <Image
                    source={item.profilePic ? { uri: item.profilePic } : ProfilePicturePlaceHolder}
                    style={styles.profilePicture}
                />
                <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>{`${item.fname} ${item.lname}`}</Text>
                    <Text style={styles.employeeUsername}>
                        <Icon name="account" size={14} color="#666" /> {item.userName}
                    </Text>
                    <Text style={styles.employeePhone}>
                        <Icon name="phone" size={14} color="#666" /> {item.phoneNumber}
                    </Text>
                    <Text style={styles.employeeEmail}>
                        <Icon name="email" size={14} color="#666" /> {item.email || 'N/A'}
                    </Text>
                    <View style={styles.statusContainer}>
                        <View style={[styles.status, { backgroundColor: item.accountStatus ? '#4CAF50' : '#F44336' }]}>
                            <Text style={styles.statusText}>{item.accountStatus ? 'Active' : 'Inactive'}</Text>
                        </View>
                    </View>
                </View>
                <Icon name="chevron-right" size={24} color="#999" style={styles.chevron} />
            </TouchableOpacity>
        );
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
            fetchEmployees(page + 1);
        }
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={employees}
                renderItem={renderEmployeeItem}
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
    employeeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    profilePicture: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
    },
    employeeInfo: {
        flex: 1,
    },
    employeeName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#333',
    },
    employeeUsername: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    employeePhone: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    employeeEmail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    status: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    chevron: {
        marginLeft: 8,
    },
    footer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});

export default AllEmployeeView;