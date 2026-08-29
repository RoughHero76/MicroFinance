import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Modal, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import ProfilePicturePlaceHolder from '../../../assets/placeholders/profile.jpg';
import { CustomToast, showToast } from '../../../components/toast/CustomToast';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import ImageModal from '../../../components/Image/ImageModal';
import { useHomeContext } from '../../../components/context/HomeContext';
import { cacheImage, deleteImage } from '../../../components/Image/ImageCache';
import { apiCall } from '../../../components/api/apiUtils';
import Screen from '../../../design/components/Screen';
import Button from '../../../design/components/Button';
import Card from '../../../design/components/Card';
import Avatar from '../../../design/components/Avatar';
import StatusPill from '../../../design/components/StatusPill';
import EmptyState from '../../../design/components/EmptyState';
import Skeleton, { SkeletonCircle } from '../../../design/components/Skeleton';
import Icon from '../../../design/Icon';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * CustomerView — customer detail rebuilt on the "Ink & Amber" design system.
 *  - profile header card (avatar + camera update badge), contact rows with
 *    tap-to-call / mail / map actions, and loan cards with a 2-column
 *    action grid (Schedule / History / Details / Assign / Close)
 *  - styled employee-assignment modal, positioned options menu, ImageModal
 *    preview, skeleton loading and EmptyState failure states
 *  - all original endpoints preserved (incl. the backend `porfilePicture`
 *    route, the case-sensitive "Closed" status check, tel:+91 dialing)
 */

const InfoRow = ({ icon, iconTone, label, value, onPress }) => {
  const t = {
    info: { bg: colors.infoSoft, fg: colors.infoInk },
    success: { bg: colors.successSoft, fg: colors.successInk },
    accent: { bg: colors.accentSoft, fg: colors.accentDeep },
  }[iconTone] || { bg: colors.neutralSoft, fg: colors.neutralInk };
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.infoRow, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.infoIconWrap, { backgroundColor: t.bg }]}>
        <Icon name={icon} size={18} color={t.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.caption, { color: colors.inkMuted }]}>{label}</Text>
        <Text numberOfLines={3} style={[type.body, { color: value ? colors.ink : colors.inkMuted, marginTop: 2 }]}>
          {value || '—'}
        </Text>
      </View>
      {onPress ? <Icon name="chevron-right" size={18} color={colors.inkMuted} /> : null}
    </Pressable>
  );
};

const Fact = ({ icon, label, value, valueColor }) => (
  <View style={styles.fact}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name={icon} size={13} color={colors.inkMuted} />
      <Text style={[type.caption, { color: colors.inkMuted }]}>{label}</Text>
    </View>
    <Text numberOfLines={1} style={[type.bodyBold, { color: valueColor || colors.ink, marginTop: 3 }]}>
      {value || '—'}
    </Text>
  </View>
);

const LoanCard = ({ loan, employeesCount, onAction }) => {
  const isClosed = loan.status === 'Closed';
  const action = (kind) => () => onAction(kind, loan._id);
  return (
    <Card padded={false} elevation="subtle">
      <View style={styles.loanTop}>
        <View style={{ flex: 1 }}>
          <Text style={[type.h1, { color: colors.ink }]}>₹{loan.loanAmount ?? '—'}</Text>
          <Text style={[type.sub, { color: colors.inkMuted, marginTop: 2 }]}>
            Loan #{loan.loanNumber ?? '—'}
          </Text>
        </View>
        {loan.status ? <StatusPill status={loan.status} /> : null}
      </View>

      <View style={styles.factsGrid}>
        <Fact icon="calendar" label="Duration" value={loan.loanDuration} />
        <Fact icon="numeric" label="Installments" value={`${loan.numberOfInstallments ?? '—'} ${loan.installmentFrequency ? `· ${loan.installmentFrequency}` : ''}`.trim()} />
        <Fact icon="bill" label="Total Paid" value={`₹${loan.totalPaid ?? 0}`} valueColor={colors.successInk} />
        <Fact icon="briefcase" label="Business" value={loan.businessFirmName} />
        <Fact icon="home" label="Business Address" value={loan.businessAddress} />
        <Fact
          icon="user"
          label="Assigned To"
          value={loan.assignedTo ? `${loan.assignedTo.fname || ''} ${loan.assignedTo.lname || ''}`.trim() : 'Unassigned'}
          valueColor={loan.assignedTo ? colors.ink : colors.dangerInk}
        />
      </View>

      <View style={styles.actionsGrid}>
        <Button label="Schedule" icon="calendar" variant="outline" size="sm" full onPress={action('schedule')} />
        <Button label="History" icon="history" variant="outline" size="sm" full onPress={action('history')} />
        <Button label="Details" icon="file" variant="outline" size="sm" full onPress={action('details')} />
        {!isClosed && (
          <Button
            label={loan.assignedTo ? 'Reassign' : 'Assign'}
            icon="user-cog"
            variant="subtle"
            size="sm"
            full
            onPress={action('assign')}
          />
        )}
        {!isClosed && (
          <Button label="Close" icon="close" variant="danger" size="sm" full onPress={action('close')} />
        )}
      </View>
      {isClosed && (
        <View style={styles.closedBanner}>
          <Icon name="check-circle" size={16} color={colors.neutralInk} />
          <Text style={[type.bodyBold, { color: colors.neutralInk, marginLeft: 8 }]}>This loan is closed</Text>
        </View>
      )}
    </Card>
  );
};

const CustomerView = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { uid } = route.params || {};
  const { employees } = useHomeContext();

  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorView, setErrorView] = useState(false);
  const [profilePicUploadLoading, setProfilePicUploadLoading] = useState(false);
  const [imageUri, setImageUri] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);

  const [optionModalVisible, setOptionModalVisible] = useState(false);
  const [optionModalPosition, setOptionModalPosition] = useState({ top: 0, right: 0 });

  const fetchCustomerData = async (targetUid) => {
    try {
      setLoading(true);
      const response = await apiCall(`/api/admin/customer?uid=${targetUid}`, 'GET');
      if (response.status === 'success' && response.data?.[0]) {
        setCustomerData(response.data[0]);
        setErrorView(false);
      } else {
        showToast('error', 'Error', response.message || 'Failed to fetch customer data');
        setErrorView(true);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      setErrorView(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData(uid);
  }, [uid]);

  useEffect(() => {
    let active = true;
    const loadCachedImage = async () => {
      if (customerData?.profilePic) {
        const cachedUri = await cacheImage(customerData.profilePic);
        if (active && cachedUri) setImageUri(cachedUri);
      }
    };
    loadCachedImage();
    return () => { active = false; };
  }, [customerData?.profilePic]);

  const name = `${customerData?.fname || ''} ${customerData?.lname || ''}`.trim();
  const addressLine = customerData
    ? [customerData.address, customerData.city, customerData.state, customerData.country].filter(Boolean).join(', ')
    : '';

  const openContact = (kind, value) => {
    if (!value) return;
    const url =
      kind === 'phone'
        ? `tel:+91${value}`
        : kind === 'email'
          ? `mailto:${value}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
    Linking.openURL(url).catch((err) => console.error('Linking error:', err));
  };

  const openOptionModal = (event) => {
    const { pageY, pageX } = event.nativeEvent;
    setOptionModalPosition({ top: pageY + 10, right: 10 });
    setOptionModalVisible(true);
  };

  const closeOptionModal = () => setOptionModalVisible(false);

  const handleEditCustomer = () => {
    closeOptionModal();
    navigation.navigate('EditCustomer', { customerData });
  };

  const handleImageOpen = () => {
    setCurrentImage(customerData?.profilePic || ProfilePicturePlaceHolder);
    closeOptionModal();
    setImageModalVisible(true);
  };

  const handleDeleteCustomer = () => {
    closeOptionModal();
    Alert.alert(
      'Delete Customer',
      'Are you sure you want to delete this customer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiCall(`/api/admin/customer?uid=${customerData.uid}`, 'DELETE');
              if (response.status === 'success') {
                showToast('success', 'Success', 'Customer deleted successfully');
                navigation.goBack();
              } else {
                showToast('error', 'Error', response.message || 'Failed to delete customer');
              }
            } catch (error) {
              console.error('Error deleting customer:', error);
              showToast('error', 'Error', 'Failed to delete customer');
            }
          },
        },
      ]
    );
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Update Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: () => launchCamera({ mediaType: 'photo', quality: 0.3 }, handleImageSelection) },
        { text: 'Choose from Library', onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.3 }, handleImageSelection) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleImageSelection = async (response) => {
    if (response.didCancel) return;
    if (response.error) {
      console.error('ImagePicker Error: ', response.error);
      return;
    }
    try {
      setProfilePicUploadLoading(true);
      const asset = response.assets[0];
      const file = { uri: asset.uri, type: asset.type, name: 'profilePic.jpg' };
      const formData = new FormData();
      formData.append('profilePic', file);

      const uploadResponse = await apiCall(
        `/api/admin/customer/profile/porfilePicture?uid=${customerData.uid}`,
        'POST',
        formData,
        true,
        { 'Content-Type': 'multipart/form-data' }
      );

      if (uploadResponse.status === 'success') {
        showToast('success', 'Success', 'Profile picture updated successfully');
        deleteImage(customerData.profilePic);
        fetchCustomerData(uid);
      } else {
        showToast('error', 'Error', uploadResponse.message || 'Failed to update profile picture');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      showToast('error', 'Error', 'Failed to process image');
    } finally {
      setProfilePicUploadLoading(false);
    }
  };

  const handleLoanAction = (kind, loanId) => {
    if (kind === 'schedule') navigation.navigate('RepaymentSchedule', { loanId });
    else if (kind === 'history') navigation.navigate('PaymentHistory', { loanId });
    else if (kind === 'details') navigation.navigate('LoanDetails', { loanId });
    else if (kind === 'close') navigation.navigate('CloseLoan', { loanId });
    else if (kind === 'assign') {
      setSelectedLoanId(loanId);
      setModalVisible(true);
    }
  };

  const assignEmployee = async (employeeId) => {
    try {
      setAssigning(true);
      const response = await apiCall('/api/admin/loan/assign', 'POST', {
        loanId: selectedLoanId,
        employeeId,
      });
      if (response.status === 'success') {
        showToast('success', 'Success', 'Employee assigned successfully');
        fetchCustomerData(uid);
      } else {
        showToast('error', 'Error', response.message || 'Failed to assign employee');
      }
    } catch (error) {
      console.error('Error assigning employee:', error);
      showToast('error', 'Error', 'Failed to assign employee');
    } finally {
      setAssigning(false);
      setModalVisible(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll bg={colors.bg}>
        <View style={styles.page}>
          <View style={styles.skeletonRow}>
            <SkeletonCircle size={64} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Skeleton width="55%" height={16} />
              <View style={{ height: spacing.sm }} />
              <Skeleton width="35%" height={12} />
            </View>
          </View>
          <View style={{ height: spacing.md }} />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={56} radius={radius.md} style={{ marginBottom: spacing.sm }} />
          ))}
          <View style={{ height: spacing.xl }} />
          <Skeleton width="30%" height={14} />
          <View style={{ height: spacing.lg }} />
          <Skeleton width="100%" height={200} radius={radius.lg} />
        </View>
      </Screen>
    );
  }

  if (errorView || !customerData) {
    return (
      <Screen bg={colors.bg}>
        <EmptyState
          icon="alert-circle"
          title="Couldn't load this customer"
          subtitle="Check your connection, then try again."
          action={{ label: 'Retry', icon: 'refresh', variant: 'accent', onPress: () => fetchCustomerData(uid) }}
          style={{ flex: 1, justifyContent: 'center' }}
        />
        <CustomToast />
      </Screen>
    );
  }

  return (
    <Screen scroll bg={colors.bg} keyboardShouldPersistTaps="handled" scrollProps={{ showsVerticalScrollIndicator: false }}>
      <View style={styles.page}>
        {profilePicUploadLoading ? (
          <Card
            style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center' }}
            padded
          >
            <Text style={[type.body, { color: colors.ink, flex: 1 }]}>Uploading profile picture…</Text>
            <Icon name="refresh" size={16} color={colors.accentDeep} />
          </Card>
        ) : null}

        {/* Profile header */}
        <Card padded={false} elevation="card">
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrap}>
              <Avatar name={name} size={64} image={imageUri} ring />
              <Pressable
                onPress={handleImagePicker}
                accessibilityRole="button"
                accessibilityLabel="Change profile picture"
                style={({ pressed }) => [styles.cameraBadge, pressed && { opacity: 0.8 }]}
              >
                <Icon name="camera" size={15} color={colors.accentInk} />
              </Pressable>
            </View>
            <View style={styles.profileText}>
              <Text numberOfLines={1} style={[type.h1, { color: colors.ink, fontSize: 22 }]}>
                {name || 'Customer'}
              </Text>
              {customerData.userName ? (
                <Text style={[type.sub, { color: colors.inkSecondary, marginTop: 2 }]}>
                  @{customerData.userName}
                </Text>
              ) : null}
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => fetchCustomerData(uid)}
                accessibilityRole="button"
                accessibilityLabel="Refresh"
                style={({ pressed }) => [styles.headerIconButton, pressed && { opacity: 0.7 }]}
              >
                <Icon name="refresh" size={20} color={colors.inkSecondary} />
              </Pressable>
              <Pressable
                onPress={openOptionModal}
                accessibilityRole="button"
                accessibilityLabel="More options"
                style={({ pressed }) => [styles.headerIconButton, pressed && { opacity: 0.7 }]}
              >
                <Icon name="dots-vertical" size={20} color={colors.inkSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.contactBlock}>
            <InfoRow
              icon="email"
              iconTone="info"
              label="Email"
              value={customerData.email}
              onPress={() => openContact('email', customerData.email)}
            />
            <InfoRow
              icon="phone"
              iconTone="success"
              label="Phone"
              value={customerData.phoneNumber}
              onPress={() => openContact('phone', customerData.phoneNumber)}
            />
            <InfoRow
              icon="map-marker"
              iconTone="accent"
              label="Address"
              value={addressLine}
              onPress={() => openContact('address', addressLine)}
            />
          </View>
        </Card>

        {/* Loans section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Loans</Text>
          <Button label="New Loan" icon="plus" variant="accent" size="sm" onPress={() => navigation.navigate('CreateLoan', { customerUid: uid })} />
        </View>

        {customerData.loans && customerData.loans.length > 0 ? (
          customerData.loans.map((loan) => (
            <LoanCard key={loan._id} loan={loan} onAction={handleLoanAction} />
          ))
        ) : (
          <EmptyState
            icon="bill"
            title="No loans yet"
            subtitle="Create the first loan for this customer."
            action={{ label: 'New Loan', icon: 'plus', variant: 'accent', onPress: () => navigation.navigate('CreateLoan', { customerUid: uid }) }}
          />
        )}
      </View>

      {/* Assign employee modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Card style={styles.assignModal}>
            <View style={styles.assignHead}>
              <View style={{ flex: 1 }}>
                <Text style={[type.title, { color: colors.ink }]}>Assign Employee</Text>
                <Text style={[type.sub, { color: colors.inkMuted, marginTop: 2 }]}>
                  Pick the field officer for this loan
                </Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <Icon name="close" size={20} color={colors.inkMuted} />
              </Pressable>
            </View>

            <View style={styles.assignList}>
              {(employees || []).map((employee) => (
                <Pressable
                  key={employee._id}
                  onPress={() => assignEmployee(employee._id)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.employeeRow, pressed && { backgroundColor: colors.surfaceAlt }]}
                >
                  <Avatar name={`${employee.fname || ''} ${employee.lname || ''}`} size={38} />
                  <Text numberOfLines={1} style={[type.bodyBold, { color: colors.ink, marginLeft: spacing.sm }]}>
                    {`${employee.fname || ''} ${employee.lname || ''}`.trim() || 'Employee'}
                  </Text>
                  <Icon name="chevron-right" size={16} color={colors.inkMuted} />
                </Pressable>
              ))}
              {(!employees || employees.length === 0) && (
                <Text style={[type.sub, { color: colors.inkMuted, textAlign: 'center', paddingVertical: spacing.lg }]}>
                  No employees available
                </Text>
              )}
            </View>

            <Button
              label={assigning ? 'Assigning…' : 'Cancel'}
              variant="ghost"
              full
              loading={assigning}
              disabled={assigning}
              onPress={() => setModalVisible(false)}
            />
          </Card>
        </View>
        <CustomToast />
      </Modal>

      {/* Options menu */}
      <Modal animationType="fade" transparent visible={optionModalVisible} onRequestClose={closeOptionModal}>
        <Pressable style={styles.modalOverlay} activeOpacity={1} onPress={closeOptionModal}>
          <Card style={[styles.optionMenu, { top: optionModalPosition.top, right: optionModalPosition.right }]}>
            <Pressable style={styles.optionRow} onPress={handleEditCustomer} accessibilityRole="button">
              <View style={[styles.optionIconWrap, { backgroundColor: colors.accentSoft }]}>
                <Icon name="pencil" size={17} color={colors.accentDeep} />
              </View>
              <Text style={[type.bodyBold, { color: colors.ink, marginLeft: spacing.sm, flex: 1 }]}>Edit Customer</Text>
            </Pressable>
            <Pressable style={styles.optionRow} onPress={handleImageOpen} accessibilityRole="button">
              <View style={[styles.optionIconWrap, { backgroundColor: colors.infoSoft }]}>
                <Icon name="image" size={17} color={colors.infoInk} />
              </View>
              <Text style={[type.bodyBold, { color: colors.ink, marginLeft: spacing.sm, flex: 1 }]}>View Photo</Text>
            </Pressable>
            <Pressable style={styles.optionRow} onPress={handleDeleteCustomer} accessibilityRole="button">
              <View style={[styles.optionIconWrap, { backgroundColor: colors.dangerSoft }]}>
                <Icon name="user-x" size={17} color={colors.dangerInk} />
              </View>
              <Text style={[type.bodyBold, { color: colors.dangerInk, marginLeft: spacing.sm, flex: 1 }]}>Delete Customer</Text>
            </Pressable>
          </Card>
        </Pressable>
      </Modal>

      <ImageModal
        isVisible={imageModalVisible}
        imageUri={currentImage}
        onDownload={() => console.log('DownloadImage')}
        onClose={() => setImageModalVisible(false)}
      />

      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  avatarWrap: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBlock: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    margin: spacing.md,
    marginTop: 0,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    ...type.h2,
    color: colors.ink,
  },

  loanTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  factsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    margin: spacing.md,
    marginTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fact: {
    width: '48%',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
    paddingTop: 0,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutralSoft,
    borderRadius: radius.md,
    margin: spacing.md,
    marginTop: 0,
    padding: spacing.sm,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  assignModal: {
    width: '100%',
    maxWidth: 420,
  },
  assignHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  assignList: {
    maxHeight: 320,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  optionMenu: {
    position: 'absolute',
    right: 10,
    width: 220,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  optionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CustomerView;
