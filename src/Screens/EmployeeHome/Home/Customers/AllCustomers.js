import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from '../../../../components/api/apiUtils';
import { useNavigation } from '@react-navigation/native';
import ProfilePicturePlaceHolder from '../../../../assets/placeholders/profile.jpg';
import { showToast } from '../../../../components/toast/CustomToast';
import CustomToast from '../../../../components/toast/CustomToast';
import * as RNFS from '@dr.pogodin/react-native-fs';
import { colors, spacing, radii, type, shadow } from '../../../../theme/tokens';
import StatusBadge from '../../../../components/ui/StatusBadge';
import EmptyState from '../../../../components/ui/EmptyState';

// Image caching utilities
const getImageDetails = (url) => {
    try {
        const uidMatch = url.match(/\/([^\/]+)\/profile\//);
        const uid = uidMatch ? uidMatch[1] : null;
        const fileNameMatch = url.match(/\/([^\/]+)\?/);
        const fileName = fileNameMatch ? fileNameMatch[1] : null;
        return { uid, fileName };
    } catch (error) {
        console.error('Error extracting image details:', error);
        return { uid: null, fileName: null };
    }
};

const getImageFilename = (url) => {
    const { uid, fileName } = getImageDetails(url);
    if (!uid || !fileName) {
        console.error('Could not extract UID or filename from URL:', url);
        return null;
    }
    return `${uid}_${fileName}`;
};

const checkImageInCache = async (url) => {
    const filename = getImageFilename(url);
    if (!filename) return null;

    const filePath = `${RNFS.PicturesDirectoryPath}/${filename}`;
    try {
        const exists = await RNFS.exists(filePath);
        return exists ? `file://${filePath}` : null;
    } catch (error) {
        console.error('Error checking cache:', error);
        return null;
    }
};

const cacheImage = async (url) => {
    try {
        const cachedPath = await checkImageInCache(url);
        if (cachedPath) return cachedPath;

        const filename = getImageFilename(url);
        if (!filename) return null;

        const filePath = `${RNFS.PicturesDirectoryPath}/${filename}`;
        await RNFS.downloadFile({
            fromUrl: url,
            toFile: filePath,
        }).promise;

        return `file://${filePath}`;
    } catch (error) {
        console.error('Error caching image:', error);
        return null;
    }
};

// Customer Item Component with Image Caching
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

    const loan = item.loans && item.loans.length > 0 ? item.loans[0] : null;

    return (
        <TouchableOpacity
            style={styles.customerItem}
            onPress={onPress}
        >
            <Image
                source={imageSource}
                style={styles.profilePicture}
            />
            <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{`${item.fname} ${item.lname}`}</Text>
                <Text style={styles.customerPhone}>
                    <Icon name="phone" size={14} color={colors.inkFaint} /> {item.phoneNumber}
                </Text>
                <Text style={styles.customerAddress}>
                    <Icon name="map-marker" size={14} color={colors.inkFaint} /> {item.address}, {item.city}
                </Text>
                {loan && (
                    <View style={styles.loanContainer}>
                        <Text style={styles.loanAmount}>
                            <Icon name="currency-inr" size={14} color={colors.success} /> {loan.loanAmount}
                        </Text>
                        <Text style={styles.loanDuration}>
                            <Icon name="calendar-range" size={14} color={colors.info} /> {loan.loanDuration}
                        </Text>
                        <StatusBadge status={loan.status} />
                    </View>
                )}
            </View>
            <Icon name="chevron-right" size={24} color={colors.inkFaint} style={styles.chevron} />
        </TouchableOpacity>
    );
});

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
            const response = await apiCall(`/api/employee/loan/customers?page=${pageNumber}&limit=10`, 'GET');
            if (response.status === 'success') {
                if (pageNumber === 1) {
                    setCustomers(response.data);
                } else {
                    setCustomers(prevCustomers => [...prevCustomers, ...response.data]);
                }
                setHasMore(response.hasMore);
                setPage(pageNumber);
            } else {
                showToast('error', 'Failed to fetch customers');
            }
        } catch (error) {
            console.error(error);
            showToast('error', 'An unexpected error occurred');
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
                        onPress={() => navigation.navigate('CustomerView', { id: item._id })}
                    />
                )}
                keyExtractor={item => item._id}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.1}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={
                    <EmptyState
                        icon="account-group-outline"
                        title="No Customers Found"
                        message="Customers assigned to you will appear here."
                        style={{ marginTop: spacing.xxl }}
                    />
                }
                contentContainerStyle={styles.listContent}
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.card,
        borderRadius: radii.lg,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        ...shadow.card,
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
        fontSize: type.sizes.lg,
        fontWeight: type.weights.bold,
        marginBottom: spacing.xs,
        color: colors.ink,
    },
    customerPhone: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginBottom: 2,
    },
    customerAddress: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginBottom: spacing.sm,
    },
    loanContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    loanAmount: {
        fontSize: type.sizes.sm,
        color: colors.success,
    },
    loanDuration: {
        fontSize: type.sizes.sm,
        color: colors.info,
    },
    chevron: {
        marginLeft: spacing.sm,
    },
    footer: {
        paddingVertical: spacing.xl,
        alignItems: 'center',
    },
});

export default AllCustomerView;
