import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast } from '../../../components/toast/CustomToast';
import { useRoute, useNavigation } from '@react-navigation/native';
import Screen from '../../../design/components/Screen';
import Card from '../../../design/components/Card';
import Button from '../../../design/components/Button';
import Avatar from '../../../design/components/Avatar';
import EmptyState from '../../../design/components/EmptyState';
import Skeleton, { SkeletonCircle } from '../../../design/components/Skeleton';
import Icon from '../../../design/Icon';
import { colors, spacing, radius, type } from '../../../design/tokens';
import ImageModal from '../../../components/Image/ImageModal';

/**
 * EmployeeView — employee profile rebuilt on the "Ink & Amber" design
 * system.
 *  - same data flow: GET /api/admin/employee?uid=&includeSensitiveData=true,
 *    pull-to-refresh, the tappable profile photo opening the shared
 *    ImageModal (with the download no-op stub kept) and the
 *    "Edit Details" → navigate('EditEmployee', { employeeData }) hand-off
 *  - presentation: centred avatar header, tinted icon chips per fact,
 *    verification glyphs (check-circle / alert-circle) and a proper
 *    not-found state (was a bare "No employee data found" text)
 */

const IconChip = ({ icon, bg, fg }) => (
  <View style={[styles.chip, { backgroundColor: bg }]}>
    <Icon name={icon} size={18} color={fg} />
  </View>
);

const InfoRow = ({ icon, iconBg, iconFg, label, value, verified }) => (
  <View style={styles.infoRow}>
    <IconChip icon={icon} bg={iconBg} fg={iconFg} />
    <View style={styles.infoContent}>
      <Text style={[type.caption, { color: colors.inkMuted }]}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[type.bodyBold, { color: colors.ink }]}>
          {value || '—'}
        </Text>
        {verified !== undefined && (
          <Icon
            name={verified ? 'check-circle' : 'alert-circle'}
            size={15}
            color={verified ? colors.successInk : colors.warningInk}
            style={{ marginLeft: 6 }}
          />
        )}
      </View>
    </View>
  </View>
);

const EmployeeView = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);

  const uid = route.params?.uid;

  const fetchEmployeeData = async () => {
    try {
      const response = await apiCall(`/api/admin/employee?uid=${uid}&includeSensitiveData=true`, 'GET');

      if (response.status === 'success' && response.data.length > 0) {
        setEmployeeData(response.data[0]);
      } else {
        showToast('error', 'Failed to load employee data');
      }
    } catch (error) {
      showToast('error', 'Error fetching employee data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEmployeeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    fetchEmployeeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const handleImageOpen = () => {
    setCurrentImage(employeeData?.profilePic || null);
    setImageModalVisible(true);
  };

  const handleDownloadProfilePicture = () => {
    console.log('DownloadIamge')
  };

  const handleEditEmployee = () => {
    navigation.navigate('EditEmployee', { employeeData });
  };

  if (loading) {
    return (
      <Screen bg={colors.bg}>
        <View style={styles.skeletonHeader}>
          <SkeletonCircle size={96} />
          <View style={{ height: spacing.md }} />
          <Skeleton width="45%" height={18} />
          <View style={{ height: spacing.sm }} />
          <Skeleton width="30%" height={14} />
        </View>
        <View style={{ padding: spacing.md }}>
          <Card>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <SkeletonCircle size={36} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Skeleton width="30%" height={11} />
                  <View style={{ height: 5 }} />
                  <Skeleton width="70%" height={14} />
                </View>
              </View>
            ))}
          </Card>
        </View>
      </Screen>
    );
  }

  if (!employeeData) {
    return (
      <Screen bg={colors.bg}>
        <EmptyState
          icon="person-off"
          title="Employee not found"
          subtitle="The employee profile could not be loaded."
          style={{ flex: 1, justifyContent: 'center' }}
        />
      </Screen>
    );
  }

  const name = `${employeeData.fname || ''} ${employeeData.lname || ''}`.trim();

  return (
    <Screen scroll bg={colors.bg} refreshControl={{ refreshing, onRefresh }}>
      <View style={styles.page}>
        {/* Profile header */}
        <Card tone="dark" style={styles.headerCard}>
          <View style={styles.header}>
            <Pressable onPress={handleImageOpen} style={({ pressed }) => pressed && { opacity: 0.9 }}>
              <Avatar name={name} size={92} image={employeeData.profilePic || null} ring />
            </Pressable>
            <Text style={[type.h1, { color: colors.onDark, marginTop: spacing.md }]}>
              {name}
            </Text>
            <Text style={[type.sub, { color: 'rgba(248, 250, 252, 0.7)', marginTop: 2 }]}>
              @{employeeData.userName}
            </Text>
            <Button
              label="Edit Details"
              icon="pencil"
              variant="accent"
              style={{ marginTop: spacing.lg }}
              onPress={handleEditEmployee}
            />
          </View>
        </Card>

        {/* Contact & account facts */}
        <Card style={{ marginTop: spacing.md }}>
          <InfoRow
            icon="email"
            iconBg={colors.infoSoft}
            iconFg={colors.infoInk}
            label="Email"
            value={employeeData.email}
            verified={employeeData.emailVerified}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="phone"
            iconBg={colors.successSoft}
            iconFg={colors.successInk}
            label="Phone"
            value={employeeData.phoneNumber}
            verified={employeeData.phoneNumberVerified}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="pin"
            iconBg={colors.neutralSoft}
            iconFg={colors.neutralInk}
            label="Address"
            value={employeeData.address}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="phone-alert"
            iconBg={colors.warningSoft}
            iconFg={colors.warningInk}
            label="Emergency Contact"
            value={employeeData.emergencyContact}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="clock"
            iconBg={colors.infoSoft}
            iconFg={colors.infoInk}
            label="Member Since"
            value={new Date(employeeData.createdAt).toLocaleDateString()}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="bills"
            iconBg={colors.accentSoft}
            iconFg={colors.accentDeep}
            label="Repayments Collected"
            value={(employeeData.collectedRepayments?.length ?? 0).toString()}
          />
        </Card>
      </View>

      <ImageModal
        isVisible={imageModalVisible}
        imageUri={currentImage}
        onDownload={handleDownloadProfilePicture}
        onClose={() => setImageModalVisible(false)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  headerCard: {
    borderRadius: radius.xl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm + 2,
  },
  chip: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs + 2,
  },
  skeletonHeader: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});

export default EmployeeView;
