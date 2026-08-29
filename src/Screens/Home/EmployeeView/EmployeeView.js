import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from "../../../components/api/apiUtils";
import { showToast } from "../../../components/toast/CustomToast";
import { useRoute, useNavigation } from "@react-navigation/native";
import ProfilePicturePlaceHolder from "../../../assets/placeholders/profile.jpg";
import ImageModal from '../../../components/Image/ImageModal';
import { colors, spacing, type, radii } from "../../../theme/tokens";
import EviCard from "../../../components/ui/EviCard";
import EviButton from "../../../components/ui/EviButton";
import EmptyState from "../../../components/ui/EmptyState";

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
            const response = await apiCall(`/api/admin/employee?uid=${uid}&includeSensitiveData=true`, 'GET',);

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

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchEmployeeData();
    }, []);

    useEffect(() => {
        fetchEmployeeData();
    }, []);

    const handleImageOpen = () => {
        setCurrentImage(employeeData?.profilePic || ProfilePicturePlaceHolder);
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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.brand} />
            </View>
        );
    }

    if (!employeeData) {
        return (
            <View style={styles.loadingContainer}>
                <EmptyState
                    icon="account-off-outline"
                    title="No employee data found"
                    message="Try pulling to refresh."
                />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[colors.brand]}
                    tintColor={colors.brand}
                />
            }
        >
            <EviCard style={styles.profileHeaderCard} elevated={false}>
                <TouchableOpacity onPress={() => handleImageOpen()}>
                    <Image
                        source={employeeData.profilePic ? { uri: employeeData.profilePic } : ProfilePicturePlaceHolder}
                        style={styles.profilePic}
                    />
                </TouchableOpacity>

                <Text style={styles.name}>{`${employeeData.fname} ${employeeData.lname}`}</Text>
                <Text style={styles.username}>@{employeeData.userName}</Text>

                <EviButton
                    title="Edit Details"
                    onPress={handleEditEmployee}
                    icon="pencil"
                    variant="secondary"
                    size="md"
                    style={styles.editButton}
                />
            </EviCard>

            <EviCard style={styles.infoCard} elevated={false}>
                <InfoItem
                    icon="email"
                    label="Email"
                    value={employeeData.email}
                    verified={employeeData.emailVerified}
                />
                <InfoItem
                    icon="phone"
                    label="Phone"
                    value={employeeData.phoneNumber}
                    verified={employeeData.phoneNumberVerified}
                />
                <InfoItem
                    icon="map-marker"
                    label="Address"
                    value={employeeData.address}
                />
                <InfoItem
                    icon="phone-alert"
                    label="Emergency Contact"
                    value={employeeData.emergencyContact}
                />
                <InfoItem
                    icon="clock-outline"
                    label="Member Since"
                    value={new Date(employeeData.createdAt).toLocaleDateString()}
                />
                <InfoItem
                    icon="cash-multiple"
                    label="Repayments Collected"
                    value={employeeData.collectedRepayments.length.toString()}
                />
            </EviCard>
            <ImageModal
                isVisible={imageModalVisible}
                imageUri={currentImage}
                onDownload={handleDownloadProfilePicture}
                onClose={() => setImageModalVisible(false)}
            />
        </ScrollView>
    );
};

const InfoItem = ({ icon, label, value, verified }) => (
    <View style={styles.infoItem}>
        <View style={styles.infoIconChip}>
            <Icon name={icon} size={18} color={colors.brand} />
        </View>
        <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>{label}</Text>
            <View style={styles.infoValueContainer}>
                <Text style={styles.infoValue}>{value}</Text>
                {verified !== undefined && (
                    <Icon
                        name={verified ? "check-circle" : "alert-circle"}
                        size={16}
                        color={verified ? colors.success : colors.warning}
                        style={styles.verificationIcon}
                    />
                )}
            </View>
        </View>

    </View>
);

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
    profileHeaderCard: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    profilePic: {
        width: 96,
        height: 96,
        borderRadius: 48,
        marginBottom: spacing.md,
    },
    name: {
        fontSize: type.sizes.xxl,
        fontWeight: type.weights.bold,
        color: colors.ink,
        marginBottom: spacing.xs,
    },
    username: {
        fontSize: type.sizes.md,
        color: colors.inkSoft,
    },
    editButton: {
        marginTop: spacing.lg,
    },
    infoCard: {
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    infoIconChip: {
        width: 34,
        height: 34,
        borderRadius: radii.md,
        backgroundColor: colors.brandTint,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: type.sizes.xs,
        color: colors.inkSoft,
        marginBottom: 2,
    },
    infoValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoValue: {
        fontSize: type.sizes.md,
        color: colors.ink,
        fontWeight: type.weights.medium,
    },
    verificationIcon: {
        marginLeft: spacing.sm,
    },
});

export default EmployeeView;
