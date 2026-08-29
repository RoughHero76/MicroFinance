import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { apiCall } from '../../../../components/api/apiUtils';
import { useNavigation } from '@react-navigation/native';
import ProfilePicturePlaceHolder from '../../../../assets/placeholders/profile.jpg';
import * as RNFS from '@dr.pogodin/react-native-fs';
import { showToast } from '../../../../components/toast/CustomToast';
import CustomToast from '../../../../components/toast/CustomToast';
import Card from '../../../../design/components/Card';
import StatusPill from '../../../../design/components/StatusPill';
import EmptyState from '../../../../design/components/EmptyState';
import Skeleton from '../../../../design/components/Skeleton';
import Icon from '../../../../design/Icon';
import { colors, spacing, radius, type } from '../../../../design/tokens';

/**
 * Employee customer list — rebuilt on the "Ink & Amber" design system.
 *  - behaviour preserved 1:1: the same
 *    /api/employee/loan/customers?page=N&limit=10 pagination + hasMore
 *    handling, load-more at 0.1 threshold, navigation to CustomerView
 *    ({id}), and the RNFS profile-picture download cache
 *  - toasts keep their original message pairs (Error / Failed to fetch
 *    customers, Error / An unexpected error occurred)
 *  - fixes: the old rows rendered <Icon> *inside* <Text> (a crash in RN —
 *    Text may only wrap Text), now proper row layouts
 *  - design: surface cards with avatars, icon detail rows, a loan strip
 *    (amount · duration · StatusPill), skeletons while loading, a real
 *    empty state and pull-to-refresh
 */

// Image caching utilities (unchanged behaviour)
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

const DetailRow = ({ icon, text, tint = colors.inkSecondary }) => (
  <View style={styles.detailRow}>
    <Icon name={icon} size={15} color={colors.inkMuted} />
    <Text style={styles.detailText} numberOfLines={1}>
      {text}
    </Text>
  </View>
);

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
    <Card elevation="subtle" onPress={onPress} style={{ marginBottom: spacing.md }}>
      <View style={styles.itemRow}>
        <View style={styles.avatarWrap}>
          <Image source={imageSource} style={styles.avatar} resizeMode="cover" />
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {`${item.fname || ''} ${item.lname || ''}`.trim() || 'Customer'}
          </Text>
          <DetailRow icon="phone" text={item.phoneNumber} />
          <DetailRow icon="map-marker" text={`${item.address || ''}, ${item.city || ''}`.trim()} />

          {loan ? (
            <View style={styles.loanStrip}>
              <View style={styles.loanChip}>
                <Icon name="currency-inr" size={14} color={colors.successInk} />
                <Text style={styles.loanChipText}>
                  ₹{Number(loan.loanAmount || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.loanChip}>
                <Icon name="calendar-range" size={14} color={colors.infoInk} />
                <Text style={styles.loanChipText}>{loan.loanDuration}</Text>
              </View>
              <StatusPill status={loan.status} dot={false} style={{ marginLeft: spacing.xs }} />
            </View>
          ) : null}
        </View>

        <Icon name="chevron-right" size={20} color={colors.borderStrong} />
      </View>
    </Card>
  );
});

const LoadingList = () => (
  <View style={styles.listPadding}>
    {[0, 1, 2].map((i) => (
      <Card key={i} padded={false} style={{ marginBottom: spacing.md }}>
        <View style={[styles.itemRow, { padding: spacing.lg }]}>
          <SkeletonCircle size={56} />
          <View style={[styles.info, { gap: spacing.xs }]}>
            <Skeleton width="55%" height={16} />
            <Skeleton width="75%" height={12} />
            <Skeleton width="65%" height={12} />
          </View>
        </View>
      </Card>
    ))}
  </View>
);

const SkeletonCircle = ({ size }) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.border,
      marginRight: spacing.md,
    }}
  />
);

const AllCustomerView = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigation = useNavigation();

  const fetchCustomers = async (pageNumber) => {
    if (loading && pageNumber > 1) return;
    if (pageNumber > 1 && !hasMore) return;
    setLoading(true);
    if (pageNumber === 1) setRefreshing(true);
    try {
      const response = await apiCall(`/api/employee/loan/customers?page=${pageNumber}&limit=10`, 'GET');
      if (response.status === 'success') {
        if (pageNumber === 1) {
          setCustomers(response.data);
        } else {
          setCustomers((prevCustomers) => [...prevCustomers, ...response.data]);
        }
        setHasMore(response.hasMore);
        setPage(pageNumber);
      } else {
        showToast('error', 'Error', 'Failed to fetch customers');
      }
    } catch (error) {
      console.error(error);
      showToast('error', 'Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchCustomers(page + 1);
    }
  };

  if (loading && customers.length === 0) {
    return (
      <View style={styles.container}>
        <LoadingList />
        <CustomToast />
      </View>
    );
  }

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
        keyExtractor={(item) => item._id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchCustomers(1)} tintColor={colors.inkMuted} />
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <EmptyState
            icon="users"
            title="No customers found"
            subtitle="Customers you are working with will appear here."
            style={{ marginTop: spacing.xxxl }}
          />
        }
        contentContainerStyle={styles.listPadding}
      />
      <CustomToast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listPadding: {
    padding: spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
  },
  info: {
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    ...type.h2,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  detailText: {
    ...type.sub,
    color: colors.inkSecondary,
    marginLeft: spacing.xs,
    flexShrink: 1,
  },
  loanStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  loanChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  loanChipText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.ink,
    marginLeft: 5,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});

export default AllCustomerView;
