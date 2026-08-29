import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast } from '../../../components/toast/CustomToast';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, type, radii } from '../../../theme/tokens';
import EviTextField from '../../../components/ui/EviTextField';
import EviButton from '../../../components/ui/EviButton';
import EviCard from '../../../components/ui/EviCard';

const EditCustomerScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { customerData } = route.params || {};

    const [formData, setFormData] = useState({
        fname: customerData.fname,
        lname: customerData.lname,
        gender: customerData.gender,
        email: customerData.email,
        userName: customerData.userName,
        phoneNumber: customerData.phoneNumber,
        address: customerData.address,
        city: customerData.city,
        state: customerData.state,
        country: customerData.country,
        pincode: customerData.pincode,
    });

    const handleChange = (name, value) => {
        setFormData(prevState => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleSubmit = async () => {
        try {
            const response = await apiCall(`/api/admin/customer?uid=${customerData.uid}`, 'PUT', formData);
            if (response.status === 'success') {
                showToast('success', 'Success', 'Customer updated successfully');
                navigation.goBack();
            } else {
                showToast('error', 'Error', response.message || 'Failed to update customer');
            }
        } catch (error) {
            console.error('Error updating customer:', error);
            showToast('error', 'Error', 'Failed to update customer');
        }
    };

    const fieldLeft = (icon) => <Icon name={icon} size={20} color={colors.inkFaint} style={styles.iconPad} />;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <View style={styles.headerIconRing}>
                        <Icon name="pencil" size={26} color={colors.brand} />
                    </View>
                    <Text style={styles.headerText}>Edit Customer</Text>
                    <Text style={styles.headerSub}>Update profile and contact details</Text>
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

                    <View style={styles.pickerWrap}>
                        <Icon name="gender-male-female" size={20} color={colors.inkFaint} style={styles.iconPad} />
                        <Picker
                            selectedValue={formData.gender}
                            style={styles.picker}
                            onValueChange={(value) => handleChange('gender', value)}
                        >
                            <Picker.Item label="Select Gender" value="" />
                            <Picker.Item label="Male" value="Male" />
                            <Picker.Item label="Female" value="Female" />
                            <Picker.Item label="Other" value="Other" />
                        </Picker>
                    </View>

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
                        label="City"
                        value={formData.city}
                        onChangeText={(value) => handleChange('city', value)}
                        left={fieldLeft("city")}
                    />
                    <EviTextField
                        label="State"
                        value={formData.state}
                        onChangeText={(value) => handleChange('state', value)}
                        left={fieldLeft("map-marker")}
                    />
                    <EviTextField
                        label="Country"
                        value={formData.country}
                        onChangeText={(value) => handleChange('country', value)}
                        left={fieldLeft("flag")}
                    />
                    <EviTextField
                        label="Pincode"
                        value={formData.pincode}
                        onChangeText={(value) => handleChange('pincode', value)}
                        keyboardType="numeric"
                        left={fieldLeft("postage-stamp")}
                    />
                </EviCard>

                <EviButton
                    title="Update Customer"
                    onPress={handleSubmit}
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
    header: {
        alignItems: "center",
        marginBottom: spacing.xl,
    },
    headerIconRing: {
        width: 56,
        height: 56,
        borderRadius: radii.xl,
        backgroundColor: colors.brandTint,
        alignItems: "center",
        justifyContent: "center",
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
    },
    pickerWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.line,
        marginBottom: spacing.md,
    },
    iconPad: {
        margin: spacing.md,
    },
    picker: {
        flex: 1,
        height: 56,
        color: colors.ink,
    },
    submitButton: {
        marginTop: spacing.lg,
    },
});

export default EditCustomerScreen;
