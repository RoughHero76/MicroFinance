import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from "../../../components/api/apiUtils";
import { showToast } from "../../../components/toast/CustomToast";
import { useRoute, useNavigation } from "@react-navigation/native";
import ProfilePicturePlaceHolder from "../../../assets/placeholders/profile.jpg";
const EmployeeView = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const [employeeData, setEmployeeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const uid = route.params.uid;
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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0066CC" />
            </View>
        );
    }

    if (!employeeData) {
        return (
            <View style={styles.errorContainer}>
                <Text>No employee data found</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <View style={styles.profileHeader}>
                <Image
                    source={employeeData.profilePic ? { uri: employeeData.profilePic } : ProfilePicturePlaceHolder}
                    style={styles.profilePic}
                />
                <Text style={styles.name}>{`${employeeData.fname} ${employeeData.lname}`}</Text>
                <Text style={styles.username}>@{employeeData.userName}</Text>
            </View>

            <View style={styles.infoSection}>
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
            </View>
        </ScrollView>
    );
};

const InfoItem = ({ icon, label, value, verified }) => (
    <View style={styles.infoItem}>
        <Icon name={icon} size={24} color="#333" style={styles.infoIcon} />
        <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>{label}</Text>
            <View style={styles.infoValueContainer}>
                <Text style={styles.infoValue}>{value}</Text>
                {verified !== undefined && (
                    <Icon
                        name={verified ? "check-circle" : "alert-circle"}
                        size={16}
                        color={verified ? "#4CAF50" : "#FFC107"}
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
        backgroundColor: '#F5F5F5',
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
    profileHeader: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    profilePic: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 10,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    username: {
        fontSize: 16,
        color: '#666666',
    },
    infoSection: {
        backgroundColor: '#FFFFFF',
        marginTop: 10,
        padding: 15,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    infoIcon: {
        marginRight: 15,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 2,
    },
    infoValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoValue: {
        fontSize: 16,
        color: '#333333',
    },
    verificationIcon: {
        marginLeft: 5,
    },
});

export default EmployeeView;