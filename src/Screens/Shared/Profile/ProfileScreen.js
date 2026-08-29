import React, { useEffect, useState, useMemo } from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator, ImageBackground, TouchableOpacity } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import { showToast, CustomToast } from "../../../components/toast/CustomToast";
import { useHomeContext } from "../../../components/context/HomeContext";
import { apiCall } from "../../../components/api/apiUtils";
import ProfileCoverImage0 from "../../../assets/bg/bgProfile0.jpg";
import ProfileCoverImage1 from "../../../assets/bg/bgProfile1.jpg";
import ProfileCoverImage2 from "../../../assets/bg/bgProfile2.jpg";
import ProfileCoverImage3 from "../../../assets/bg/bgProfile3.jpg";
import ProfileCoverImage4 from "../../../assets/bg/bgProfile4.jpg";
import ProfileCoverImage5 from "../../../assets/bg/bgProfile5.jpg";
import ProfileCoverImageSpecial from "../../../assets/bg/bgProfileSpecial.jpg";
import DefaultProfilePicture from "../../../assets/placeholders/profile.jpg";
import Screen from "../../../design/components/Screen";
import Card from "../../../design/components/Card";
import EmptyState from "../../../design/components/EmptyState";
import Skeleton from "../../../design/components/Skeleton";
import Icon from "../../../design/Icon";
import { FadeInUp } from "../../../design/motion";
import { colors, spacing, radius, type, shadow } from "../../../design/tokens";

/**
 * Profile screen — rebuilt on the "Ink & Amber" design system.
 *  - behaviour preserved 1:1: the role-based GET
 *    /api/{admin|employee}/profile fetch, the random cover image
 *    (6 normal + 5% special, chosen once per mount), the
 *    launchImageLibrary selection with the same options, the FormData
 *    upload to POST /api/shared/profile/add/porfilePicture (the
 *    original endpoint typo is kept so the API contract is untouched),
 *    the upload overlay state, and the employee-only Address /
 *    Emergency Contact rows
 *  - every toast keeps its original 2-arg (type, message) shape
 *  - fix: the original used icons that do not exist in the icon set
 *    (person, location-on, emergency, verified-user, access-time), which
 *    rendered blank; each row now maps to a verified icon. The
 *    double-semicolon import and the dead `profilePic` style are gone
 *  - design: a photo cover with an amber camera badge, a surface info
 *    card with icon chips + dividers, semantic value colours for the
 *    account status, a skeleton header on first load, an empty state
 *    with a retry action when the fetch fails, and staggered FadeInUp
 *    entrances
 */

const ProfileRow = ({ icon, label, value, valueColor }) => (
  <View style={styles.row}>
    <View style={styles.rowIconChip}>
      <Icon name={icon} size={18} color={colors.inkSecondary} />
    </View>
    <View style={styles.rowBody}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: valueColor || colors.ink }]} numberOfLines={2}>
        {value || "N/A"}
      </Text>
    </View>
  </View>
);

const LoadingProfile = () => (
  <View style={styles.page}>
    <Card padded={false} style={{ marginBottom: spacing.md }}>
      <View style={styles.coverSkeleton}>
        <Skeleton width={120} height={120} radius={radius.full} />
        <Skeleton width="50%" height={22} style={{ marginTop: spacing.md }} />
        <Skeleton width="30%" height={16} style={{ marginTop: spacing.xs }} />
      </View>
    </Card>
    <Card padded={false}>
      <View style={{ padding: spacing.md, gap: spacing.md }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: "row", gap: spacing.sm }}>
            <Skeleton width={40} height={40} radius={radius.md} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="30%" height={12} />
              <Skeleton width="55%" height={14} />
            </View>
          </View>
        ))}
      </View>
    </Card>
  </View>
);

const ProfileScreen = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { user } = useHomeContext();

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const backgroundImages = [
    ProfileCoverImage0,
    ProfileCoverImage1,
    ProfileCoverImage2,
    ProfileCoverImage3,
    ProfileCoverImage4,
    ProfileCoverImage5,
  ];

  const selectedBackgroundImage = useMemo(() => {
    const randomNumber = Math.random();
    if (randomNumber < 0.05) {
      // 5% chance for special image
      return ProfileCoverImageSpecial;
    }
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    return backgroundImages[randomIndex];
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const API_URL = user?.role === "admin" ? "/api/admin/profile" : "/api/employee/profile";
      const response = await apiCall(API_URL, "GET");

      if (response?.status === "success") {
        setProfile(response.data);
      } else {
        showToast("error", `Failed to fetch profile: ${response?.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      showToast("error", "An error occurred while fetching the profile");
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelection = async () => {
    const options = {
      mediaType: "photo",
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        return;
      }

      if (response.error) {
        console.error("ImagePicker Error: ", response.error);
        showToast("error", "Failed to select image");
        return;
      }

      try {
        setUploadingImage(true);
        const asset = response.assets[0];

        const file = {
          uri: asset.uri,
          type: asset.type,
          name: "profilePic.jpg",
        };

        const formData = new FormData();
        formData.append("profilePic", file);

        const uploadResponse = await apiCall(
          "/api/shared/profile/add/porfilePicture",
          "POST",
          formData,
          true,
          {
            "Content-Type": "multipart/form-data",
          }
        );

        if (uploadResponse.status === "success") {
          showToast("success", "Profile picture updated successfully");
          fetchProfile();
        } else {
          showToast("error", uploadResponse.message || "Failed to update profile picture");
        }
      } catch (error) {
        console.error("Error processing image:", error);
        showToast("error", "Failed to process image");
      } finally {
        setUploadingImage(false);
      }
    });
  };

  if (loading) {
    return (
      <Screen>
        <LoadingProfile />
        <CustomToast />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <View style={styles.page}>
          <EmptyState
            icon="alert-circle"
            title="Failed to load profile"
            subtitle="Check your connection and try again."
            action={{ label: "Try Again", icon: "refresh", variant: "outline", onPress: fetchProfile }}
            style={{ marginTop: spacing.xxxl }}
          />
        </View>
        <CustomToast />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <FadeInUp>
        <View style={styles.coverWrap}>
          <ImageBackground source={selectedBackgroundImage} style={styles.cover} resizeMode="cover">
            <View style={styles.coverScrim} pointerEvents="none" />
            <View style={styles.coverContent}>
              <TouchableOpacity
                onPress={handleImageSelection}
                disabled={uploadingImage}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <View style={styles.avatarRing}>
                  {uploadingImage ? (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="large" color={colors.ink} />
                    </View>
                  ) : profile.profilePic ? (
                    <Image source={{ uri: profile.profilePic }} style={styles.profileImage} resizeMode="cover" />
                  ) : (
                    <Image source={DefaultProfilePicture} style={styles.profileImage} resizeMode="cover" />
                  )}
                </View>
                {!uploadingImage ? (
                  <View style={styles.cameraBadge}>
                    <Icon name="camera-alt" size={16} color={colors.ink} />
                  </View>
                ) : null}
              </TouchableOpacity>

              <Text style={styles.name} numberOfLines={2}>
                {`${profile.fname} ${profile.lname}`}
              </Text>
              <View style={styles.rolePill}>
                <Text style={styles.roleText}>{profile.role}</Text>
              </View>
            </View>
          </ImageBackground>
        </View>
      </FadeInUp>

      <FadeInUp delay={80}>
        <Card padded={false} elevation="subtle" style={{ margin: spacing.lg, overflow: "hidden" }}>
          <ProfileRow icon="email-outline" label="Email" value={profile.email} />
          <ProfileRow icon="phone" label="Phone" value={profile.phoneNumber} />
          <ProfileRow icon="account" label="Username" value={profile.userName} />
          {profile.role === "employee" ? (
            <>
              <ProfileRow icon="map-marker" label="Address" value={profile.address} />
              <ProfileRow icon="phone-alert" label="Emergency Contact" value={profile.emergencyContact} />
            </>
          ) : null}
          <ProfileRow
            icon="shield-check"
            label="Account Status"
            value={profile.accountStatus ? "Active" : "Inactive"}
            valueColor={profile.accountStatus ? colors.successInk : colors.dangerInk}
          />
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowIconChip}>
              <Icon name="clock" size={18} color={colors.inkSecondary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Last Login</Text>
              <Text style={styles.rowValue} numberOfLines={2}>
                {new Date(profile.lastLogin || profile.loginHistory?.date).toLocaleString()}
              </Text>
            </View>
          </View>
        </Card>
      </FadeInUp>
      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
  },
  coverSkeleton: {
    padding: spacing.xl,
    alignItems: "center",
  },

  coverWrap: {
    ...shadow.medium,
  },
  cover: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  coverScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },
  coverContent: {
    alignItems: "center",
  },
  avatarRing: {
    width: 128,
    height: 128,
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceAlt,
    ...shadow.medium,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: radius.full,
  },
  uploadingOverlay: {
    width: "100%",
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    ...type.display,
    color: colors.surface,
    marginTop: spacing.md,
    textAlign: "center",
  },
  rolePill: {
    marginTop: spacing.xs,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  roleText: {
    ...type.caption,
    fontWeight: "700",
    color: colors.surface,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIconChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    ...type.caption,
    color: colors.inkMuted,
  },
  rowValue: {
    ...type.body,
    fontWeight: "600",
    marginTop: 2,
  },
});

export default ProfileScreen;
