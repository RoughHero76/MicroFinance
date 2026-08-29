import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Platform, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { Picker } from "@react-native-picker/picker";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import { apiCall } from "../../../components/api/apiUtils";
import { showToast, CustomToast } from "../../../components/toast/CustomToast";
import Screen from "../../../design/components/Screen";
import Card from "../../../design/components/Card";
import Button from "../../../design/components/Button";
import TextField from "../../../design/components/TextField";
import Icon from "../../../design/Icon";
import { FadeInUp } from "../../../design/motion";
import { colors, spacing, radius, type } from "../../../design/tokens";

/**
 * Create-lead form — rebuilt on the "Ink & Amber" design system.
 *  - behaviour preserved 1:1: react-hook-form with the same fields,
 *    default values (loanTypes[0] / loanDurations[0]) and validation rules,
 *    the camera/gallery image picker (same options + picture shape),
 *    the picture-required and loan-amount guards, the exact FormData
 *    payload to POST /api/employee/lead/create (isFormData), the success
 *    toast + reset + goBack, and the catch Alert
 *  - every toast keeps its original 3-arg (type, title, message) shape
 *  - fix: the original double semicolon (`Icon from ... ;;`) and the
 *    unused LinearGradient wrapper are gone; the page now uses the design
 *    Screen container with keyboard avoidance instead of a raw
 *    KeyboardAvoidingView
 *  - design: section cards with icon chips, design text fields with
 *    leading icons and inline validation, Picker rows with chevrons,
 *    a circular photo target with Camera/Gallery buttons, staggered
 *    FadeInUp entrances and a full-width accent submit button
 */

const loanTypes = [
  "Personal Loan",
  "Home Loan",
  "Business Loan",
  "Education Loan",
  "Vehicle Loan",
  "Gold Loan",
  "Other",
];

const loanDurations = [
  "100 days",
  "200 days",
  "300 days",
  "400 days",
  "500 days",
  "600 days",
  "700 days",
  "800 days",
  "900 days",
  "1000 days",
  "1100 days",
  "1200 days",
  "1300 days",
  "1400 days",
  "1500 days",
  "1600 days",
  "1700 days",
  "1800 days",
  "1900 days",
  "2000 days",
  "2100 days",
  "2200 days",
];

const SectionCard = ({ icon, title, children }) => (
  <Card elevation="subtle" style={{ marginBottom: spacing.md }}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconChip}>
        <Icon name={icon} size={18} color={colors.accentDeep} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionBody}>{children}</View>
  </Card>
);

const PickerField = ({ label, value, onValueChange, options }) => (
  <View style={styles.pickerWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.pickerContainer}>
      <Picker selectedValue={value} onValueChange={onValueChange} style={styles.picker}>
        {options.map((option, index) => (
          <Picker.Item key={index} label={option} value={option} />
        ))}
      </Picker>
      <Icon name="chevron-down" size={18} color={colors.inkMuted} />
    </View>
  </View>
);

const CreateLeadScreen = () => {
  const navigation = useNavigation();
  const { control, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      loanType: loanTypes[0],
      loanAmount: "",
      loanDuration: loanDurations[0],
      loanPurpose: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [picture, setPicture] = useState(null);

  const pickImage = async (sourceType) => {
    const options = {
      mediaType: "photo",
      quality: 0.7,
      maxWidth: 800,
      maxHeight: 800,
      includeBase64: false,
    };

    try {
      const result =
        sourceType === "camera" ? await launchCamera(options) : await launchImageLibrary(options);

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        showToast("error", "Error", result.errorMessage);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPicture({
          uri: Platform.OS === "android" ? asset.uri : asset.uri.replace("file://", ""),
          type: asset.type || "image/jpeg",
          name: asset.fileName || `image-${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      console.error("Image picker error:", error);
      showToast("error", "Error", "Failed to pick image");
    }
  };

  const onSubmit = async (data) => {
    if (!picture) {
      showToast("error", "Missing Field", "Please upload applicant picture");
      return;
    }

    // Convert loan amount to number and validate
    const loanAmount = parseFloat(data.loanAmount);
    if (isNaN(loanAmount) || loanAmount <= 0) {
      showToast("error", "Invalid Input", "Please enter a valid loan amount");
      return;
    }

    setLoading(true);

    try {
      // Create form data properly
      const formData = new FormData();

      // Append all form fields with proper data types
      formData.append("name", data.name.trim());
      formData.append("phone", data.phone.trim());
      formData.append("email", data.email ? data.email.trim() : "");
      formData.append("address", data.address.trim());
      formData.append("city", data.city.trim());
      formData.append("state", data.state.trim());
      formData.append("loanType", data.loanType);
      formData.append("loanAmount", loanAmount.toString());
      formData.append("loanDuration", data.loanDuration);
      formData.append("loanPurpose", data.loanPurpose.trim());

      // Append the image with exact required format for multer
      formData.append("picture", {
        uri: picture.uri,
        type: picture.type,
        name: picture.name,
      });
      const response = await apiCall("/api/employee/lead/create", "POST", formData, true);

      if (response.error) {
        showToast("error", "Error", response.message || "Failed to create lead");
      } else {
        showToast("success", "Success", "Lead created successfully");
        // Reset form
        setPicture(null);
        reset();
        // Navigate back or to leads list
        navigation.goBack();
      }
    } catch (error) {
      console.error("Form submission error:", error);
      Alert.alert("Error", "Failed to create lead. Please check your input and try again.", [
        { text: "OK" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (name) => (errors[name] ? errors[name].message : undefined);

  return (
    <Screen scroll keyboardAvoid>
      <View style={styles.page}>
        <FadeInUp>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Lead</Text>
            <Text style={styles.headerSubtitle}>Add a potential loan applicant</Text>
          </View>
        </FadeInUp>

        {/* Profile picture */}
        <FadeInUp delay={60}>
          <Card elevation="subtle" style={{ marginBottom: spacing.md }}>
            <View style={styles.imageSection}>
              {picture ? (
                <Image source={{ uri: picture.uri }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Icon name="account-circle" size={64} color={colors.borderStrong} />
                </View>
              )}
              <View style={styles.imageButtons}>
                <Button
                  label="Camera"
                  icon="camera"
                  variant="outline"
                  size="sm"
                  flex
                  onPress={() => pickImage("camera")}
                />
                <Button
                  label="Gallery"
                  icon="image"
                  variant="outline"
                  size="sm"
                  flex
                  onPress={() => pickImage("gallery")}
                />
              </View>
              {!picture ? (
                <Text style={styles.requiredNote}>*Profile picture is required</Text>
              ) : (
                <View style={styles.photoChosenRow}>
                  <Icon name="check-circle" size={15} color={colors.successInk} />
                  <Text style={styles.photoChosen}>Applicant picture attached</Text>
                </View>
              )}
            </View>
          </Card>
        </FadeInUp>

        {/* Personal Information */}
        <FadeInUp delay={120}>
          <SectionCard icon="account" title="Personal Information">
            <Controller
              control={control}
              name="name"
              rules={{
                required: "Name is required",
                minLength: { value: 3, message: "Name must be at least 3 characters" },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Full Name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter full name"
                  leftIcon="account"
                  error={fieldError("name")}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              rules={{
                required: "Phone number is required",
                pattern: { value: /^[0-9]{10}$/, message: "Enter a valid 10-digit phone number" },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Phone Number"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter 10-digit phone number"
                  leftIcon="phone"
                  keyboardType="phone-pad"
                  error={fieldError("phone")}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              rules={{
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address or leave empty",
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Email Address"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter email address (optional)"
                  leftIcon="email-outline"
                  keyboardType="email-address"
                  error={fieldError("email")}
                />
              )}
            />
          </SectionCard>
        </FadeInUp>

        {/* Address Information */}
        <FadeInUp delay={180}>
          <SectionCard icon="map-marker" title="Address Information">
            <Controller
              control={control}
              name="address"
              rules={{
                required: "Address is required",
                minLength: { value: 5, message: "Address must be at least 5 characters" },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Address"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter street address"
                  leftIcon="map-marker"
                  error={fieldError("address")}
                />
              )}
            />

            <View style={styles.row}>
              <Controller
                control={control}
                name="city"
                rules={{ required: "City is required" }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="City"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter city"
                    leftIcon="city"
                    error={fieldError("city")}
                    style={{ flex: 1, marginRight: spacing.xs }}
                  />
                )}
              />

              <Controller
                control={control}
                name="state"
                rules={{ required: "State is required" }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="State"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter state"
                    leftIcon="globe"
                    error={fieldError("state")}
                    style={{ flex: 1 }}
                  />
                )}
              />
            </View>
          </SectionCard>
        </FadeInUp>

        {/* Loan Details */}
        <FadeInUp delay={240}>
          <SectionCard icon="briefcase" title="Loan Details">
            <Controller
              control={control}
              name="loanType"
              rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <PickerField
                  label="Loan Type"
                  value={value}
                  onValueChange={onChange}
                  options={loanTypes}
                />
              )}
            />

            <Controller
              control={control}
              name="loanAmount"
              rules={{
                required: "Loan amount is required",
                pattern: {
                  value: /^[0-9]+(\.[0-9]{1,2})?$/,
                  message: "Enter a valid amount (numbers only)",
                },
                validate: (value) => parseFloat(value) > 0 || "Amount must be greater than zero",
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Loan Amount (₹)"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter loan amount"
                  leftIcon="currency-inr"
                  keyboardType="numeric"
                  error={fieldError("loanAmount")}
                />
              )}
            />

            <Controller
              control={control}
              name="loanDuration"
              rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <PickerField
                  label="Loan Duration"
                  value={value}
                  onValueChange={onChange}
                  options={loanDurations}
                />
              )}
            />

            <Controller
              control={control}
              name="loanPurpose"
              rules={{
                required: "Loan purpose is required",
                minLength: {
                  value: 10,
                  message: "Please provide a detailed purpose (min 10 characters)",
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Loan Purpose"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Describe loan purpose"
                  leftIcon="target"
                  multiline
                  numberOfLines={3}
                  error={fieldError("loanPurpose")}
                />
              )}
            />
          </SectionCard>
        </FadeInUp>

        <FadeInUp delay={300}>
          <Button
            label="Create Lead"
            icon="check-circle"
            variant="accent"
            size="lg"
            full
            loading={loading}
            onPress={handleSubmit(onSubmit)}
          />
        </FadeInUp>
      </View>
      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...type.h1,
    color: colors.ink,
  },
  headerSubtitle: {
    ...type.sub,
    color: colors.inkSecondary,
    marginTop: 4,
  },

  imageSection: {
    alignItems: "center",
    gap: spacing.sm,
  },
  photo: {
    width: 112,
    height: 112,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  photoPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  imageButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    alignSelf: "stretch",
  },
  requiredNote: {
    ...type.caption,
    color: colors.danger,
  },
  photoChosenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  photoChosen: {
    ...type.caption,
    fontWeight: "600",
    color: colors.successInk,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionIconChip: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    ...type.h2,
    color: colors.ink,
  },
  sectionBody: {
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
  },

  pickerWrap: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...type.caption,
    color: colors.inkSecondary,
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingRight: spacing.sm,
  },
  picker: {
    flex: 1,
    height: 48,
    color: colors.ink,
  },
});

export default CreateLeadScreen;
