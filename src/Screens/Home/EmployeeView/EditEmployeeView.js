import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast } from '../../../components/toast/CustomToast';
import { useNavigation, useRoute } from '@react-navigation/native';

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

    if (!employeeData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text>No employee data provided</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.card}>
                    <Text style={styles.heading}>Edit Employee</Text>

                    <View style={styles.inputContainer}>
                        <Icon name="account-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="First Name"
                            value={formData.fname}
                            onChangeText={(value) => handleChange('fname', value)}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="account-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Last Name"
                            value={formData.lname}
                            onChangeText={(value) => handleChange('lname', value)}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="email-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={formData.email}
                            onChangeText={(value) => handleChange('email', value)}
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="account-circle-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            value={formData.userName}
                            onChangeText={(value) => handleChange('userName', value)}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="phone-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            value={formData.phoneNumber}
                            onChangeText={(value) => handleChange('phoneNumber', value)}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="home-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Address"
                            value={formData.address}
                            onChangeText={(value) => handleChange('address', value)}
                            multiline
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="phone-alert" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Emergency Contact"
                            value={formData.emergencyContact}
                            onChangeText={(value) => handleChange('emergencyContact', value)}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.switchRow}>
                        <View style={styles.switchLabelContainer}>
                            <Icon name="account-check-outline" size={20} color="#666" style={styles.icon} />
                            <Text style={styles.switchLabel}>Account Active</Text>
                        </View>
                        <Switch
                            value={formData.accountStatus}
                            onValueChange={(value) => handleChange('accountStatus', value)}
                        />
                    </View>

                    <View style={styles.sectionDivider} />
                    <Text style={styles.sectionLabel}>Reset Password (optional)</Text>

                    <View style={styles.inputContainer}>
                        <Icon name="lock-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="New Password"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="lock-check-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm New Password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                        />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
                        <Text style={styles.buttonText}>{loading ? 'Updating...' : 'Update Employee'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#e5e5e5',
    },
    scrollContainer: {
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        paddingLeft: 10,
        paddingRight: 10,
        marginBottom: 15,
    },
    input: {
        flex: 1,
        padding: 10,
        fontSize: 16,
        color: '#333',
    },
    icon: {
        marginRight: 10,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 15,
    },
    switchLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    switchLabel: {
        fontSize: 16,
        color: '#333',
    },
    sectionDivider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 15,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    button: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default EditEmployeeView;
