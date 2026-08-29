//src/screens/Home/EmployeeView/EmployeeRegistration.js
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { apiCall } from "../../../components/api/apiUtils";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { CustomToast, showToast } from "../../../components/toast/CustomToast";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing, type, radii } from "../../../theme/tokens";
import EviTextField from "../../../components/ui/EviTextField";
import EviButton from "../../../components/ui/EviButton";
import EviCard from "../../../components/ui/EviCard";

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

  const fieldLeft = (icon) => <Icon name={icon} size={20} color={colors.inkFaint} style={styles.iconPad} />;

  const renderInput = (name, label, icon, keyboardType = "default", secure = false) => (
    <View style={styles.fieldWrap}>
      <EviTextField
        label={label}
        value={formData[name]}
        onChangeText={(text) => handleInputChange(name, text)}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        left={fieldLeft(icon)}
        error={!!errors[name]}
      />
      {errors[name] ? <Text style={styles.errorText}>{errors[name]}</Text> : null}
    </View>
  );

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
          <Text style={styles.headerText}>Employee Registration</Text>
          <Text style={styles.headerSub}>Create a new field team account</Text>
        </View>

        <EviCard elevated={false} style={styles.formCard}>
          {renderInput("fname", "First Name", "account")}
          {renderInput("lname", "Last Name", "account")}
          {renderInput("email", "Email", "email", "email-address")}
          {renderInput("userName", "Username", "account-circle")}
          {renderInput("phoneNumber", "Phone Number", "phone", "phone-pad")}
          {renderInput("password", "Password", "lock", "default", true)}
          {renderInput("confirmPassword", "Confirm Password", "lock-check", "default", true)}
          {renderInput("address", "Address", "home")}
          {renderInput("emergencyContact", "Emergency Contact", "phone-alert", "phone-pad")}

          <View style={styles.pickerWrap}>
            <Icon name="account-tie" size={20} color={colors.inkFaint} style={styles.iconPad} />
            <Picker
              selectedValue={formData.role}
              style={styles.picker}
              onValueChange={(itemValue) => handleInputChange("role", itemValue)}
            >
              <Picker.Item label="Employee" value="employee" />
            </Picker>
          </View>
        </EviCard>

        <EviButton
          title="Register Employee"
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
  fieldWrap: {
    marginBottom: spacing.xs,
  },
  errorText: {
    color: colors.danger,
    fontSize: type.sizes.xs,
    marginTop: 2,
    marginLeft: spacing.xs,
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

export default EmployeeRegistration;
