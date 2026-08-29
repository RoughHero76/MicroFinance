import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from '../../../components/api/apiUtils';
import { useNavigation } from '@react-navigation/native';
import ProfilePicturePlaceHolder from '../../../assets/placeholders/profile.jpg';
import { showToast, CustomToast } from '../../../components/toast/CustomToast';
import { cacheImage } from '../../../components/Image/ImageCache';
import { colors, radii, spacing, type, shadow } from '../../../theme/tokens';
import EviCard from '../../../components/ui/EviCard';
import StatusBadge from '../../../components/ui/StatusBadge';

// Updated CustomerItem component using the new caching logic
const CustomerItem = React.memo(({ item, onPress }) => {
    const [imageSource, setImageSource] = useState(
        item?.profilePic ? { uri: item.profilePic } : ProfilePicturePlaceHolder
    );

    useEffect(() => {
        const loadCachedImage = async () => {
            if (item?.profilePic) {
                const cachedUri = await cacheImage(item.profilePic);
                if (cachedUri) {
                    setImageSource({ uri: cachedUri });
                }
            }
        };

        loadCachedImage();
    }, [item?.profilePic]);

    const renderLoanItem = (loan) => (
        <View style={styles.loanItem} key={loan?._id}>
            <View style={styles.loanHeader}>
                <Text style={styles.loanNumber}>Loan #{loan?.loanNumber ?? 'N/A'}</Text>
                <StatusBadge status={loan?.status ?? 'unknown'} />
            </View>
            <View style={styles.loanDetails}>
                <Text style={styles.loanAmount}>
                    <Icon name="currency-inr" size={14} color={colors.brand} /> {loan?.loanAmount ?? 'N/A'}
                </Text>
                <Text style={styles.loanDuration}>
                    <Icon name="calendar-range" size={14} color={colors.info} /> {loan?.loanDuration ?? 'N/A'}
                </Text>
            </View>
            <Text style={styles.loanAssignee}>
                <Icon name="account" size={14} color={colors.inkSoft} /> {loan?.assignedTo?.fname ?? 'N/A'} {loan?.assignedTo?.lname ?? ''}
            </Text>
        </View>
    );

    return (
        <EviCard style={styles.customerItem} onPress={onPress} elevated={false} padding={0}>
            <View style={styles.customerHeader}>
                <Image
                    source={imageSource}
                    style={styles.profilePicture}
                />
                <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{`${item?.fname ?? 'Unknown'} ${item?.lname ?? ''}`}</Text>
                    <Text style={styles.customerPhone}>
                        <Icon name="phone" size={14} color={colors.inkSoft} /> {item?.phoneNumber ?? 'N/A'}
                    </Text>
                    <Text style={styles.customerAddress}>
                        <Icon name="map-marker" size={14} color={colors.inkSoft} /> {`${item?.address ?? ''}, ${item?.city ?? ''}`}
                    </Text>
                </View>
                <Icon name="chevron-right" size={24} color={colors.inkFaint} style={styles.chevron} />
            </View>
            {item?.loans && item.loans.length > 0 && (
                <View style={styles.loansContainer}>
                    {item.loans.map(renderLoanItem)}
                </View>
            )}
        </EviCard>
    );
});


const AllCustomerView = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation();

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchCustomers(1).then(() => setRefreshing(false));
    }, []);

    const fetchCustomers = async (pageNumber) => {
        if ((loading && !refreshing) || !hasMore) return;
        setLoading(true);
        try {
            const response = await apiCall(`/api/admin/customer?page=${pageNumber}&limit=10`, 'GET');
            if (response.status === 'success') {
                if (pageNumber === 1) {
                    setCustomers(response.data);
                    setHasMore(true);
                } else {
                    setCustomers(prevCustomers => [...prevCustomers, ...response.data]);
                }
                setHasMore(response.data.length === 10);
                setPage(pageNumber);
            } else {
                showToast('error', 'Error', 'Failed to fetch customers');
            }
        } catch (error) {
            console.error(error);
            showToast('error', 'Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers(1);
    }, []);

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
            fetchCustomers(page + 1);
        }
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={customers}
                renderItem={({ item }) => (
                    <CustomerItem
                        item={item}
                        onPress={() => navigation.navigate('CustomerView', { uid: item?.uid })}
                    />
                )}
                keyExtractor={item => item?._id}
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
    customerItem: {
        marginHorizontal: spacing.xl,
        marginBottom: spacing.md,
    },
    customerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    profilePicture: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: spacing.lg,
    },
    customerInfo: {
        flex: 1,
    },
    customerName: {
        fontSize: type.sizes.lg + 1,
        fontWeight: type.weights.bold,
        marginBottom: spacing.xs,
        color: colors.ink,
    },
    customerPhone: {
        fontSize: type.sizes.md,
        color: colors.inkSoft,
        marginBottom: 2,
    },
    customerAddress: {
        fontSize: type.sizes.md,
        color: colors.inkSoft,
    },
    chevron: {
        marginLeft: spacing.sm,
    },
    loansContainer: {
        padding: spacing.lg,
        backgroundColor: colors.surface,
    },
    loanItem: {
        backgroundColor: colors.card,
        borderRadius: radii.sm,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.line,
    },
    loanHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    loanNumber: {
        fontSize: type.sizes.lg,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    loanDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    loanAmount: {
        fontSize: type.sizes.md,
        color: colors.inkSoft,
    },
    loanDuration: {
        fontSize: type.sizes.md,
        color: colors.inkSoft,
    },
    loanAssignee: {
        fontSize: type.sizes.md,
        color: colors.inkSoft,
    },
    footer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});

export default AllCustomerView;
