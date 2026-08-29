import React, { useEffect, useState, useMemo  } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, ImageBackground } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { showToast, CustomToast } from '../../../components/toast/CustomToast';
import { useHomeContext } from '../../../components/context/HomeContext';
import { apiCall } from '../../../components/api/apiUtils';
import { launchImageLibrary } from 'react-native-image-picker';
import ProfileCoverImage0 from '../../../assets/bg/bgProfile0.jpg'
import ProfileCoverImage1 from '../../../assets/bg/bgProfile1.jpg'
import ProfileCoverImage2 from '../../../assets/bg/bgProfile2.jpg'
import ProfileCoverImage3 from '../../../assets/bg/bgProfile3.jpg'
import ProfileCoverImage4 from '../../../assets/bg/bgProfile4.jpg'
import ProfileCoverImage5 from '../../../assets/bg/bgProfile5.jpg'
import ProfileCoverImageSpecial from '../../../assets/bg/bgProfileSpecial.jpg'
import DefaultProfilePicture from '../../../assets/placeholders/profile.jpg'
import { colors, spacing, type, radii } from '../../../theme/tokens';
import EviCard from '../../../components/ui/EviCard';
import StatusBadge from '../../../components/ui/StatusBadge';

const ProfileScreen = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploadingImage, setUploadingImage] = useState(false);
    const { user } = useHomeContext();

    useEffect(() => {
        fetchProfile();
    }, []);

    const backgroundImages = [
        ProfileCoverImage0,
        ProfileCoverImage1,
        ProfileCoverImage2,
        ProfileCoverImage3,
        ProfileCoverImage4,
        ProfileCoverImage5
    ];

    const selectedBackgroundImage = useMemo(() => {
        const randomNumber = Math.random();
        if (randomNumber < 0.05) { // 5% chance for special image
            return ProfileCoverImageSpecial;
        } else {
            const randomIndex = Math.floor(Math.random() * backgroundImages.length);
            return backgroundImages[randomIndex];
        }
    }, []);
    const fetchProfile = async () => {
        setLoading(true);
        try {
            const API_URL = user?.role === 'admin' ? '/api/admin/profile' : '/api/employee/profile';
            const response = await apiCall(API_URL, 'GET');

            if (response?.status === 'success') {
                setProfile(response.data);
            } else {
                showToast('error', `Failed to fetch profile: ${response?.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            showToast('error', 'An error occurred while fetching the profile');
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelection = async () => {
        const options = {
            mediaType: 'photo',
            includeBase64: false,
            maxHeight: 2000,
            maxWidth: 2000,
        };

        launchImageLibrary(options, async (response) => {
            if (response.didCancel) {
                return;
            }

            if (response.error) {
                console.error('ImagePicker Error: ', response.error);
                showToast('error', 'Failed to select image');
                return;
            }

            try {
                setUploadingImage(true);
                const asset = response.assets[0];

                const file = {
                    uri: asset.uri,
                    type: asset.type,
                    name: 'profilePic.jpg',
                };

                const formData = new FormData();
                formData.append('profilePic', file);

                const uploadResponse = await apiCall(
                    '/api/shared/profile/add/porfilePicture',
                    'POST',
                    formData,
                    true,
                    {
                        'Content-Type': 'multipart/form-data',
                    }
                );

                if (uploadResponse.status === 'success') {
                    showToast('success', 'Profile picture updated successfully');
                    fetchProfile(); // Refresh profile data
                } else {
                    showToast('error', uploadResponse.message || 'Failed to update profile picture');
                }
            } catch (error) {
                console.error('Error processing image:', error);
                showToast('error', 'Failed to process image');
            } finally {
                setUploadingImage(false);
            }
        });
    };

    const ProfileItem = ({ icon, label, value, badge }) => (
        <View style={styles.profileItem}>
            <View style={styles.iconChip}>
                <Icon name={icon} size={20} color={colors.brand} />
            </View>
            <View style={styles.profileItemContent}>
                <Text style={styles.label}>{label}</Text>
                {badge ? badge : <Text style={styles.value}>{value || 'N/A'}</Text>}
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.brand} />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Failed to load profile</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <ImageBackground source={selectedBackgroundImage} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={handleImageSelection} disabled={uploadingImage}>
                        {uploadingImage ? (
                            <View style={styles.uploadingContainer}>
                                <ActivityIndicator size="large" color="#FFFFFF" />
                            </View>
                        ) : (
                            profile.profilePic ? (
                                <Image source={{ uri: profile.profilePic }} style={styles.profileImage} />
                            ) : (
                                <Image source={DefaultProfilePicture} style={styles.profileImage} />
                            )
                        )}
                        <View style={styles.cameraIconContainer}>
                            <Icon name="camera-alt" size={20} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.name}>{`${profile.fname} ${profile.lname}`}</Text>
                    <Text style={styles.role}>{profile.role}</Text>
                </View>
            </ImageBackground>

            <EviCard style={styles.infoCard} elevated={false} padding={spacing.sm}>
                <ProfileItem icon="email" label="Email" value={profile.email} />
                <ProfileItem icon="phone" label="Phone" value={profile.phoneNumber} />
                <ProfileItem icon="person" label="Username" value={profile.userName} />
                {profile.role === 'employee' && (
                    <>
                        <ProfileItem icon="location-on" label="Address" value={profile.address} />
                        <ProfileItem icon="emergency" label="Emergency Contact" value={profile.emergencyContact} />
                    </>
                )}
                <ProfileItem
                    icon="verified-user"
                    label="Account Status"
                    badge={<StatusBadge status={profile.accountStatus ? 'Active' : 'Inactive'} />}
                />
                <ProfileItem
                    icon="access-time"
                    label="Last Login"
                    value={new Date(profile.lastLogin || profile.loginHistory?.date).toLocaleString()}
                />
            </EviCard>
            <CustomToast />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: type.sizes.lg,
        color: colors.danger,
    },
    header: {
        padding: spacing.xl,
    },
    headerContent: {
        alignItems: 'center',
    },
    uploadingContainer: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: 'rgba(10, 31, 22, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraIconContainer: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: colors.brand,
        borderRadius: 15,
        padding: spacing.sm,
        borderWidth: 2,
        borderColor: colors.white,
    },
    profileImage: {
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 3,
        borderColor: colors.white,
    },
    name: {
        fontSize: type.sizes.display,
        fontWeight: type.weights.bold,
        marginTop: spacing.lg,
        color: colors.white,
    },
    role: {
        fontSize: type.sizes.lg,
        color: colors.brandSoft,
        textTransform: 'capitalize',
        marginTop: spacing.xs,
    },
    infoCard: {
        marginTop: spacing.xl,
        marginHorizontal: spacing.lg,
    },
    profileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    iconChip: {
        width: 34,
        height: 34,
        borderRadius: radii.md,
        backgroundColor: colors.brandTint,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileItemContent: {
        flex: 1,
        marginLeft: spacing.md,
    },
    label: {
        fontSize: type.sizes.xs,
        color: colors.inkSoft,
        marginBottom: 2,
    },
    value: {
        fontSize: type.sizes.md,
        color: colors.ink,
        fontWeight: '500',
    },
});

export default ProfileScreen;
