import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { apiCall } from "../../../components/api/apiUtils";
import Toast from "react-native-toast-message";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { showToast, CustomToast } from "../../../components/toast/CustomToast";
import { useNavigation } from "@react-navigation/native";

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

    const renderInput = (name, placeholder, icon, keyboardType = "default") => (
        <View style={styles.inputContainer}>
            <Icon name={icon} size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                value={formData[name]}
                onChangeText={(text) => handleInputChange(name, text)}
                keyboardType={keyboardType}
            />
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.header}>
                    <Icon name="account-plus" size={40} color="#4F46E5" />
                    <Text style={styles.headerText}>Customer Registration</Text>
                </View>

                {renderInput("fname", "First Name", "account")}
                {renderInput("lname", "Last Name", "account")}

                <View style={styles.inputContainer}>
                    <Icon name="gender-male-female" size={20} color="#6B7280" style={styles.inputIcon} />
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

                {renderInput("email", "Email", "email", "email-address")}
                {renderInput("userName", "Username", "account-circle")}
                {renderInput("phoneNumber", "Phone Number", "phone", "phone-pad")}
                {renderInput("address", "Address", "home")}
                {renderInput("city", "City", "city")}
                {renderInput("state", "State", "map-marker")}
                {renderInput("country", "Country", "flag")}
                {renderInput("pincode", "Pincode", "postage-stamp", "numeric")}

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Icon name="check-circle" size={20} color="#FFFFFF" style={styles.submitIcon} />
                            <Text style={styles.submitButtonText}>Register Customer</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
            <CustomToast />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F3F4F6",
    },
    scrollContainer: {
        padding: 20,
    },
    header: {
        alignItems: "center",
        marginBottom: 30,
    },
    headerText: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1F2937",
        marginTop: 10,
    },
    inputContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    inputIcon: {
        padding: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        paddingRight: 10,
        fontSize: 16,
        color: "#1F2937",
    },
    picker: {
        flex: 1,
        height: 50,
        color: "#1F2937",
    },
    submitButton: {
        backgroundColor: "#4F46E5",
        borderRadius: 12,
        paddingVertical: 14,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20,
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    submitIcon: {
        marginRight: 8,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "bold",
    },
});

export default CustomerRegistration;