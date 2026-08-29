import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { apiCall } from "../../../components/api/apiUtils";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { showToast, CustomToast } from "../../../components/toast/CustomToast";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing, type, radii } from "../../../theme/tokens";
import EviTextField from "../../../components/ui/EviTextField";
import EviButton from "../../../components/ui/EviButton";
import EviCard from "../../../components/ui/EviCard";

const CustomerRegistration = () => {

    const navigation = useNavigation();

    const [formData, setFormData] = useState({
        fname: "",
        lname: "",
        gender: "",
        email: "",
        userName: "",
        phoneNumber: "",
        address: "",
        city: "",
        state: "",
        country: "",
        pincode: "",
    });

    const [loading, setLoading] = useState(false);

    const handleInputChange = (name, value) => {
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {

            const response = await apiCall("/api/admin/customer", "POST", formData);
            if (response.status === "success") {
                showToast("success", "Success", response.message);
                navigation.navigate('Menu')
            } else {
                showToast("error", "Error", response.message || "Registration failed. Please try again.");
            }
        } catch (error) {
            console.error(error);
            showToast("error", "Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    const fieldLeft = (icon) => <Icon name={icon} size={20} color={colors.inkFaint} style={styles.iconPad} />;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <View style={styles.headerIconRing}>
                        <Icon name="account-plus" size={26} color={colors.brand} />
                    </View>
                    <Text style={styles.headerText}>Customer Registration</Text>
                    <Text style={styles.headerSub}>Create a new customer profile</Text>
                </View>

                <EviCard elevated={false} style={styles.formCard}>
                    <EviTextField
                        label="First Name"
                        value={formData.fname}
                        onChangeText={(text) => handleInputChange("fname", text)}
                        left={fieldLeft("account")}
                    />
                    <EviTextField
                        label="Last Name"
                        value={formData.lname}
                        onChangeText={(text) => handleInputChange("lname", text)}
                        left={fieldLeft("account")}
                    />

                    <View style={styles.pickerWrap}>
                        <Icon name="gender-male-female" size={20} color={colors.inkFaint} style={styles.iconPad} />
                        <Picker
                            selectedValue={formData.gender}
                            style={styles.picker}
                            onValueChange={(itemValue) => handleInputChange("gender", itemValue)}
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
                        onChangeText={(text) => handleInputChange("email", text)}
                        keyboardType="email-address"
                        left={fieldLeft("email")}
                    />
                    <EviTextField
                        label="Username"
                        value={formData.userName}
                        onChangeText={(text) => handleInputChange("userName", text)}
                        left={fieldLeft("account-circle")}
                    />
                    <EviTextField
                        label="Phone Number"
                        value={formData.phoneNumber}
                        onChangeText={(text) => handleInputChange("phoneNumber", text)}
                        keyboardType="phone-pad"
                        left={fieldLeft("phone")}
                    />
                    <EviTextField
                        label="Address"
                        value={formData.address}
                        onChangeText={(text) => handleInputChange("address", text)}
                        left={fieldLeft("home")}
                    />
                    <EviTextField
                        label="City"
                        value={formData.city}
                        onChangeText={(text) => handleInputChange("city", text)}
                        left={fieldLeft("city")}
                    />
                    <EviTextField
                        label="State"
                        value={formData.state}
                        onChangeText={(text) => handleInputChange("state", text)}
                        left={fieldLeft("map-marker")}
                    />
                    <EviTextField
                        label="Country"
                        value={formData.country}
                        onChangeText={(text) => handleInputChange("country", text)}
                        left={fieldLeft("flag")}
                    />
                    <EviTextField
                        label="Pincode"
                        value={formData.pincode}
                        onChangeText={(text) => handleInputChange("pincode", text)}
                        keyboardType="numeric"
                        left={fieldLeft("postage-stamp")}
                    />
                </EviCard>

                <EviButton
                    title="Register Customer"
                    onPress={handleSubmit}
                    loading={loading}
                    icon="check-circle"
                    variant="primary"
                    size="lg"
                    style={styles.submitButton}
                />
            </ScrollView>
            <CustomToast />
        </KeyboardAvoidingView>
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

export default CustomerRegistration;
