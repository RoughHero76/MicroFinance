import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from '../../../components/api/apiUtils';
import { useNavigation } from '@react-navigation/native';
import ProfilePicturePlaceHolder from '../../../assets/placeholders/profile.jpg';
import { showToast, CustomToast } from '../../../components/toast/CustomToast';
import { colors, radii, spacing, type } from '../../../theme/tokens';
import EviCard from '../../../components/ui/EviCard';
import StatusBadge from '../../../components/ui/StatusBadge';

const AllEmployeeView = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
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
                showToast('error', 'Error', 'Failed to fetch employees');
            }
        } catch (error) {
            console.error(error);
            showToast('error', 'Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchEmployees(1).then(() => setRefreshing(false));
    }, []);

    useEffect(() => {
        fetchEmployees(1);
    }, []);

    const renderEmployeeItem = ({ item }) => (
        <EviCard
            style={styles.employeeItem}
            onPress={() => navigation.navigate('EmployeeView', { uid: item.uid })}
            elevated={false}
            padding={spacing.lg}
        >
            <Image
                source={item.profilePic ? { uri: item.profilePic } : ProfilePicturePlaceHolder}
                style={styles.profilePicture}
            />
            <View style={styles.employeeInfo}>
                <View style={styles.employeeRowTop}>
                    <Text style={styles.employeeName}>{`${item.fname} ${item.lname}`}</Text>
                    <StatusBadge status={item.accountStatus ? 'Active' : 'Inactive'} />
                </View>
                <Text style={styles.employeeMeta}>
                    <Icon name="account" size={14} color={colors.inkSoft} /> {item.userName}
                </Text>
                <Text style={styles.employeeMeta}>
                    <Icon name="phone" size={14} color={colors.inkSoft} /> {item.phoneNumber}
                </Text>
                <Text style={styles.employeeMeta}>
                    <Icon name="email" size={14} color={colors.inkSoft} /> {item.email || 'N/A'}
                </Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.inkFaint} style={styles.chevron} />
        </EviCard>
    );

    const renderFooter = () => {
        if (!loading) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.brand} />
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
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.brand]}
                        tintColor={colors.brand}
                    />
                }
            />
            <CustomToast />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    listContent: {
        paddingVertical: spacing.md,
    },
    employeeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    profilePicture: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: spacing.lg,
    },
    employeeInfo: {
        flex: 1,
    },
    employeeRowTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    employeeName: {
        fontSize: type.sizes.lg,
        fontWeight: type.weights.bold,
        color: colors.ink,
        flex: 1,
        marginRight: spacing.sm,
    },
    employeeMeta: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginBottom: 2,
    },
    chevron: {
        marginLeft: spacing.sm,
    },
    footer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});

export default AllEmployeeView;
