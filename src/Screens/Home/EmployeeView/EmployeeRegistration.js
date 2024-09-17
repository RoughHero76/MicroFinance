//src/screens/Home/EmployeeView/EmployeeRegistration.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { apiCall } from "../../../components/api/apiUtils";
import Toast from "react-native-toast-message";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { CustomToast, showToast } from "../../../components/toast/CustomToast";
import { useNavigation } from "@react-navigation/native";

const EmployeeRegistration = () => {
  const navigation = useNavigation();

  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: "",
    userName: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    address: "",
    emergencyContact: "",
    role: "employee",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (name, value) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: null }));
    }
  };

  const validateForm = () => {
    let newErrors = {};

    // Validate required fields
    ["fname", "lname", "userName", "phoneNumber", "password", "confirmPassword"].forEach((field) => {
      if (!formData[field]) {
        newErrors[field] = "This field is required";
      }
    });

    // Validate email format
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Validate password
    if (formData.password && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Validate phone number (simple check for now)
    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "Invalid phone number format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showToast("error", "Error", "Please correct the errors in the form");
      return;
    }

    setLoading(true);
    try {
      const response = await apiCall("/api/admin/employee", "POST", formData);
      if (response.status === "success") {
        showToast("success", "Success", response.message);
        navigation.navigate('Menu');
      } else {
        showToast("error", "Error", response.message || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Error", error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (name, placeholder, icon, keyboardType = "default", secureTextEntry = false) => (
    <View style={styles.inputContainer}>
      <Icon name={icon} size={20} color="#6B7280" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={formData[name]}
        onChangeText={(text) => handleInputChange(name, text)}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
      />
      {errors[name] && <Text style={styles.errorText}>{errors[name]}</Text>}
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
          <Text style={styles.headerText}>Employee Registration</Text>
        </View>

        {renderInput("fname", "First Name", "account")}
        {renderInput("lname", "Last Name", "account")}
        {renderInput("email", "Email", "email", "email-address")}
        {renderInput("userName", "Username", "account-circle")}
        {renderInput("phoneNumber", "Phone Number", "phone", "phone-pad")}
        {renderInput("password", "Password", "lock", "default", true)}
        {renderInput("confirmPassword", "Confirm Password", "lock-check", "default", true)}
        {renderInput("address", "Address", "home")}
        {renderInput("emergencyContact", "Emergency Contact", "phone-alert")}

        <View style={styles.inputContainer}>
          <Icon name="account-tie" size={20} color="#6B7280" style={styles.inputIcon} />
          <Picker
            selectedValue={formData.role}
            style={styles.picker}
            onValueChange={(itemValue) => handleInputChange("role", itemValue)}
          >
            <Picker.Item label="Employee" value="employee" />

          </Picker>
        </View>

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
              <Text style={styles.submitButtonText}>Register Employee</Text>
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
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 2,
  },
});

export default EmployeeRegistration;