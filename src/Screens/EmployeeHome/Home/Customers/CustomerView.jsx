import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from "react-native";
import Icon from '../../../../design/Icon';
import { apiCall } from "../../../../components/api/apiUtils";
import { useRoute, useNavigation } from "@react-navigation/native";
import ProfilePicturePlaceHolder from "../../../../assets/placeholders/profile.jpg";
import { showToast } from "../../../../components/toast/CustomToast";
import CustomToast from "../../../../components/toast/CustomToast";
import ImageModal from "../../../../components/Image/ImageModal";
import { cacheImage } from "../../../../components/Image/ImageCache";
import Screen from "../../../../design/components/Screen";
import Card from "../../../../design/components/Card";
import Button from "../../../../design/components/Button";
import StatusPill from "../../../../design/components/StatusPill";
import EmptyState from "../../../../design/components/EmptyState";
import Skeleton from "../../../../design/components/Skeleton";
import { colors, spacing, radius, type } from "../../../../design/tokens";

/**
 * Employee customer profile — rebuilt on the "Ink & Amber" design system.
 *  - behaviour preserved 1:1: the same
 *    /api/employee/loan/customer/profile?customerId= fetch (+ manual
 *    refresh), navigation to RepaymentSchedule / PaymentHistory /
 *    LoanDetailsScreen per loan, the profile image viewer modal + RNFS
 *    image cache, tap-to-call / tap-to-email / tap-to-map on the info rows,
 *    and the disabled "Schedule" action
 *  - the 'domain' icon (not in the design icon set) is mapped to 'briefcase'
 *  - design: profile hero card with avatar + actions, icon-chip info rows,
 *    loan cards with amount + StatusPill + action buttons, skeletons while
 *    loading and an empty state when a customer has no loans
 */

const InfoItem = ({ icon, label, value, onPress }) => (
  <TouchableOpacity
    style={styles.infoItem}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.6 : 1}
  >
    <View style={styles.infoIconWrap}>
      <Icon name={icon} size={20} color={colors.inkSecondary} />
    </View>
    <View style={styles.infoTextWrap}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={3} ellipsizeMode="tail">
        {value}
      </Text>
    </View>
  </TouchableOpacity>
);

const StatChip = ({ icon, text, tint = colors.ink }) => (
  <View style={styles.statChip}>
    <Icon name={icon} size={14} color={tint} />
    <Text style={styles.statChipText} numberOfLines={1}>
      {text}
    </Text>
  </View>
);

const LoadingProfile = () => (
  <View style={styles.page}>
    <Skeleton width="100%" height={110} radius={radius.lg} />
    <View style={{ height: spacing.md }} />
    <Skeleton width="100%" height={160} radius={radius.lg} />
    <View style={{ height: spacing.md }} />
    <Skeleton width="100%" height={180} radius={radius.lg} />
  </View>
);

const CustomerView = () => {
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params || {};

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [imageSource, setImageSource] = useState(
    customerData?.profilePic ? { uri: customerData.profilePic } : ProfilePicturePlaceHolder
  );

  const handleImageOpen = () => {
    setCurrentImage(customerData?.profilePic || ProfilePicturePlaceHolder);
    setImageModalVisible(true);
  };

  const handleDownloadProfilePicture = () => {
    console.log('DownloadIamge');
  };

  useEffect(() => {
    const loadCachedImage = async () => {
      if (customerData?.profilePic) {
        const cachedUri = await cacheImage(customerData.profilePic);
        if (cachedUri) {
          setImageSource({ uri: cachedUri });
        }
      }
    };
    loadCachedImage();
  }, [customerData?.profilePic]);

  const fetchCustomerData = async (customerId) => {
    try {
      setLoading(true);
      const response = await apiCall(`/api/employee/loan/customer/profile?customerId=${customerId}`, "GET");
      if (response.status === "success") {
        setCustomerData(response.data);
      } else {
        showToast("error", "Error", response.message || "Failed to fetch customer data");
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleRepaymentSchedule = (loanId) => {
    navigation.navigate("RepaymentSchedule", { loanId });
  };

  const handleRepaymentHistory = (loanId) => {
    navigation.navigate("PaymentHistory", { loanId });
  };

  const handleViewLoanDetails = (loanId) => {
    navigation.navigate("LoanDetailsScreen", { loanId });
  };

  const handleInfoIconPress = (icon, value) => {
    if (icon === 'phone' && value && value !== 'N/A') {
      const phoneNumber = `tel:+91${value}`;
      Linking.openURL(phoneNumber).catch((err) => console.error('An error occurred: ', err));
    }
    if (icon === 'email' && value && value !== 'N/A') {
      const email = `mailto:${value}`;
      Linking.openURL(email).catch((err) => console.error('An error occurred: ', err));
    }
    if (icon === 'address' && value && value !== 'N/A') {
      const address = `https://www.google.com/maps/search/?api=1&query=${value}`;
      Linking.openURL(address).catch((err) => console.error('An error occurred: ', err));
    }
  };

  const fullAddress =
    `${customerData?.address || 'N/A'}, ${customerData?.city || 'N/A'}, ${customerData?.state || 'N/A'}, ${customerData?.country || 'N/A'}`;

  const loans = customerData?.loans || [];

  if (loading) {
    return (
      <Screen scroll bg={colors.bg} scrollProps={{ contentContainerStyle: styles.page }}>
        <LoadingProfile />
        <CustomToast />
      </Screen>
    );
  }

  return (
    <Screen scroll bg={colors.bg} scrollProps={{ contentContainerStyle: styles.page, showsVerticalScrollIndicator: false }}>
      {/* Profile hero */}
      <Card elevation="subtle">
        <View style={styles.profileRow}>
          <TouchableOpacity onPress={handleImageOpen} activeOpacity={0.75} accessibilityRole="button">
            <View style={styles.avatarWrap}>
              <Image source={imageSource} style={styles.avatar} resizeMode="cover" />
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.customerName} numberOfLines={1}>
              {`${customerData?.fname || ''} ${customerData?.lname || ''}`.trim() || 'Customer'}
            </Text>
            <Text style={styles.customerEmail} numberOfLines={1}>
              {customerData?.email || 'No email on file'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => fetchCustomerData(id)}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Icon name="refresh" size={20} color={colors.inkSecondary} />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Contact info */}
      <Card style={{ marginTop: spacing.md }}>
        <InfoItem
          icon="phone"
          label="Phone"
          value={customerData?.phoneNumber || 'N/A'}
          onPress={() => handleInfoIconPress('phone', customerData?.phoneNumber || 'N/A')}
        />
        <InfoItem
          icon="map-marker"
          label="Address"
          value={fullAddress}
          onPress={() => handleInfoIconPress('address', customerData?.address)}
        />
        <InfoItem
          icon="email"
          label="Email"
          value={customerData?.email || 'N/A'}
          onPress={() => handleInfoIconPress('email', customerData?.email || 'N/A')}
        />
      </Card>

      {/* Loans */}
      {loans.length > 0 ? (
        loans.map((loan) => (
          <Card key={loan._id} elevation="subtle" style={{ marginTop: spacing.md }}>
            <View style={styles.loanHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.loanNumber} numberOfLines={1}>
                  Loan #{loan?.loanNumber ?? 'N/A'}
                </Text>
                <Text style={styles.loanAmount}>₹{Number(loan.loanAmount || 0).toLocaleString()}</Text>
              </View>
              <StatusPill status={loan.status} />
            </View>

            <View style={styles.loanChips}>
              <StatChip
                icon="cash"
                text={`Outstanding ₹${Number(loan.outstandingAmount || 0).toLocaleString()}`}
                tint={colors.warningInk}
              />
              <StatChip
                icon="calendar-range"
                text={`${new Date(loan.loanStartDate).toLocaleDateString()} → ${new Date(loan.loanEndDate).toLocaleDateString()}`}
                tint={colors.infoInk}
              />
            </View>

            <InfoItem icon="briefcase" label="Business Name" value={loan?.businessFirmName || 'N/A'} />
            <InfoItem icon="home" label="Business Address" value={loan?.businessAddress || 'N/A'} />

            <View style={styles.loanButtons}>
              <Button
                label="Schedule"
                icon="calendar-clock"
                variant="outline"
                size="sm"
                disabled
                onPress={() => handleRepaymentSchedule(loan._id)}
                flex
              />
              <Button
                label="History"
                icon="receipt"
                variant="subtle"
                size="sm"
                onPress={() => handleRepaymentHistory(loan._id)}
                flex
              />
              <Button
                label="Details"
                icon="file-search"
                variant="primary"
                size="sm"
                onPress={() => handleViewLoanDetails(loan._id)}
                flex
              />
            </View>
          </Card>
        ))
      ) : (
        <EmptyState
          icon="bills"
          title="No loans found"
          subtitle="This customer has no loans yet."
          style={{ marginTop: spacing.xl }}
        />
      )}

      <ImageModal
        isVisible={imageModalVisible}
        imageUri={currentImage}
        onDownload={handleDownloadProfilePicture}
        onClose={() => setImageModalVisible(false)}
      />
      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
  },
  profileInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  customerName: {
    ...type.h1,
    color: colors.ink,
  },
  customerEmail: {
    ...type.sub,
    color: colors.inkMuted,
    marginTop: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    ...type.micro,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    ...type.body,
    color: colors.ink,
    marginTop: 1,
  },

  loanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  loanNumber: {
    ...type.caption,
    color: colors.inkMuted,
  },
  loanAmount: {
    ...type.h1,
    color: colors.ink,
    marginTop: 2,
  },
  loanChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  statChipText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.ink,
    marginLeft: 5,
    maxWidth: 220,
  },
  loanButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
});

export default CustomerView;
