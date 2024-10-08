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

    const ProfileItem = ({ icon, label, value }) => (
        <View style={styles.profileItem}>
            <Icon name={icon} size={24} color="#4A90E2" style={styles.icon} />
            <View style={styles.profileItemContent}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value || 'N/A'}</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
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
                            <Image source={{ uri: profile.profilePic }} style={styles.profilePic} />
                        )}
                        <View style={styles.cameraIconContainer}>
                            <Icon name="camera-alt" size={20} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.name}>{`${profile.fname} ${profile.lname}`}</Text>
                    <Text style={styles.role}>{profile.role}</Text>
                </View>
            </ImageBackground>

            <View style={styles.infoContainer}>
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
                    value={profile.accountStatus ? 'Active' : 'Inactive'}
                />
                <ProfileItem
                    icon="access-time"
                    label="Last Login"
                    value={new Date(profile.lastLogin || profile.loginHistory?.date).toLocaleString()}
                />
            </View>
            <CustomToast />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F4F8',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 18,
        color: '#E57373',
    },
    header: {
        padding: 30,

    },
    headerContent: {
        alignItems: 'center',
    },
    profilePic: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    uploadingContainer: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraIconContainer: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#4A90E2',
        borderRadius: 15,
        padding: 5,
    },
    name: {
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 15,
        color: '#FFFFFF',
    },
    role: {
        fontSize: 18,
        color: '#E3F2FD',
        textTransform: 'capitalize',
        marginTop: 5,
    },
    infoContainer: {
        backgroundColor: '#FFFFFF',
        marginTop: 20,
        marginHorizontal: 15,
        borderRadius: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    profileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    profileItemContent: {
        flex: 1,
        marginLeft: 15,
    },
    icon: {
        width: 30,
    },
    label: {
        fontSize: 14,
        color: '#757575',
    },
    value: {
        fontSize: 16,
        color: '#333333',
        fontWeight: '500',
        marginTop: 2,
    },
});

export default ProfileScreen;