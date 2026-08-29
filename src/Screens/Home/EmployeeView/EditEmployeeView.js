import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast } from '../../../components/toast/CustomToast';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, type, radii } from '../../../theme/tokens';
import EviTextField from '../../../components/ui/EviTextField';
import EviButton from '../../../components/ui/EviButton';
import EviCard from '../../../components/ui/EviCard';
import EmptyState from '../../../components/ui/EmptyState';

const EditEmployeeView = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { employeeData } = route.params || {};

    const [formData, setFormData] = useState({
        fname: employeeData?.fname || '',
        lname: employeeData?.lname || '',
        email: employeeData?.email || '',
        userName: employeeData?.userName || '',
        phoneNumber: employeeData?.phoneNumber || '',
        address: employeeData?.address || '',
        emergencyContact: employeeData?.emergencyContact || '',
        accountStatus: employeeData?.accountStatus !== undefined ? employeeData.accountStatus : true,
    });
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (name, value) => {
        setFormData(prevState => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleSubmit = async () => {
        if (!formData.fname || !formData.lname || !formData.userName || !formData.phoneNumber) {
            showToast('error', 'Error', 'First name, last name, username and phone number are required');
            return;
        }

        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                showToast('error', 'Error', 'Passwords do not match');
                return;
            }
        }

        setLoading(true);
        try {
            const response = await apiCall(`/api/admin/employee?uid=${employeeData.uid}`, 'PUT', formData);
            if (response.status !== 'success') {
                showToast('error', 'Error', response.message || 'Failed to update employee');
                return;
            }

            if (newPassword) {
                const passwordResponse = await apiCall(`/api/admin/employee/password?uid=${employeeData.uid}`, 'PUT', { newPassword });
                if (passwordResponse.status !== 'success') {
                    showToast('error', 'Error', passwordResponse.message || 'Details updated, but password reset failed');
                    return;
                }
            }

            showToast('success', 'Success', 'Employee updated successfully');
            navigation.goBack();
        } catch (error) {
            console.error('Error updating employee:', error);
            showToast('error', 'Error', 'Failed to update employee');
        } finally {
            setLoading(false);
        }
    };

    const fieldLeft = (icon) => <Icon name={icon} size={20} color={colors.inkFaint} style={styles.iconPad} />;

    if (!employeeData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <EmptyState
                        icon="account-off-outline"
                        title="No employee data provided"
                        message="Go back and open the employee again."
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <View style={styles.headerIconRing}>
                        <Icon name="account-edit" size={26} color={colors.brand} />
                    </View>
                    <Text style={styles.headerText}>Edit Employee</Text>
                    <Text style={styles.headerSub}>Update account and contact details</Text>
                </View>

                <EviCard elevated={false} style={styles.formCard}>
                    <EviTextField
                        label="First Name"
                        value={formData.fname}
                        onChangeText={(value) => handleChange('fname', value)}
                        left={fieldLeft("account")}
                    />
                    <EviTextField
                        label="Last Name"
                        value={formData.lname}
                        onChangeText={(value) => handleChange('lname', value)}
                        left={fieldLeft("account")}
                    />
                    <EviTextField
                        label="Email"
                        value={formData.email}
                        onChangeText={(value) => handleChange('email', value)}
                        keyboardType="email-address"
                        left={fieldLeft("email")}
                    />
                    <EviTextField
                        label="Username"
                        value={formData.userName}
                        onChangeText={(value) => handleChange('userName', value)}
                        left={fieldLeft("account-circle")}
                    />
                    <EviTextField
                        label="Phone Number"
                        value={formData.phoneNumber}
                        onChangeText={(value) => handleChange('phoneNumber', value)}
                        keyboardType="phone-pad"
                        left={fieldLeft("phone")}
                    />
                    <EviTextField
                        label="Address"
                        value={formData.address}
                        onChangeText={(value) => handleChange('address', value)}
                        left={fieldLeft("home")}
                    />
                    <EviTextField
                        label="Emergency Contact"
                        value={formData.emergencyContact}
                        onChangeText={(value) => handleChange('emergencyContact', value)}
                        keyboardType="phone-pad"
                        left={fieldLeft("phone-alert")}
                    />

                    <View style={styles.switchRow}>
                        <View style={styles.switchLabelContainer}>
                            <Icon name="account-check-outline" size={20} color={colors.inkSoft} style={styles.switchIcon} />
                            <Text style={styles.switchLabel}>Account Active</Text>
                        </View>
                        <Switch
                            value={formData.accountStatus}
                            onValueChange={(value) => handleChange('accountStatus', value)}
                            trackColor={{ false: colors.line, true: colors.brandSoft }}
                            thumbColor={formData.accountStatus ? colors.brand : colors.inkFaint}
                        />
                    </View>
                </EviCard>

                <Text style={styles.sectionLabel}>Reset Password (optional)</Text>

                <EviCard elevated={false} style={styles.formCard}>
                    <EviTextField
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showPassword}
                        left={fieldLeft("lock")}
                        right={
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Icon
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={colors.inkFaint}
                                    style={styles.iconPad}
                                />
                            </TouchableOpacity>
                        }
                    />
                    <EviTextField
                        label="Confirm New Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showPassword}
                        left={fieldLeft("lock-check")}
                    />
                </EviCard>

                <EviButton
                    title="Update Employee"
                    onPress={handleSubmit}
                    loading={loading}
                    icon="check-circle"
                    variant="primary"
                    size="lg"
                    style={styles.submitButton}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    scrollContainer: {
        padding: spacing.xl,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    headerIconRing: {
        width: 56,
        height: 56,
        borderRadius: radii.xl,
        backgroundColor: colors.brandTint,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    headerText: {
        fontSize: type.sizes.xxl,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    headerSub: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginTop: spacing.xs,
    },
    formCard: {
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    iconPad: {
        margin: spacing.md,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.md,
    },
    switchLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    switchIcon: {
        marginRight: spacing.sm,
    },
    switchLabel: {
        fontSize: type.sizes.md,
        color: colors.ink,
        fontWeight: type.weights.medium,
    },
    sectionLabel: {
        fontSize: type.sizes.md,
        fontWeight: type.weights.bold,
        color: colors.ink,
        marginBottom: spacing.md,
    },
    submitButton: {
        marginTop: spacing.lg,
    },
});

export default EditEmployeeView;
