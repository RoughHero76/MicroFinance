import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast, CustomToast } from '../../../components/toast/CustomToast';
import { useNavigation } from '@react-navigation/native';
import Screen from '../../../design/components/Screen';
import Card from '../../../design/components/Card';
import Button from '../../../design/components/Button';
import TextField from '../../../design/components/TextField';
import Icon from '../../../design/Icon';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * EmployeeRegistration — employee onboarding form rebuilt on the
 * "Ink & Amber" design system.
 *  - same behaviour: identical default form values, per-field error
 *    clearing while typing, the exact validation rules and messages
 *    (required set, email format, 8-char password, match check, 10-digit
 *    phone), the same POST /api/admin/employee payload, toasts and the
 *    success navigation to 'Menu'
 *  - presentation: grouped section cards (was one flat list of inputs),
 *    design TextField / Button components, verified icon names and the
 *    single-option role picker kept as-is
 */

const SectionHeader = ({ icon, title }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionChip}>
      <Icon name={icon} size={15} color={colors.accentDeep} />
    </View>
    <Text style={[type.title, { color: colors.ink, fontSize: 15 }]}>
      {title}
    </Text>
  </View>
);

const RolePicker = ({ value, onValueChange }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>Role</Text>
    <View style={styles.pickerWrap}>
      <Icon name="account-tie" size={18} color={colors.inkMuted} />
      <Picker
        selectedValue={value}
        onValueChange={onValueChange}
        style={styles.picker}
      >
        <Picker.Item label="Employee" value="employee" />
      </Picker>
      <Icon name="chevron-down" size={16} color={colors.inkMuted} />
    </View>
  </View>
);

const EmployeeRegistration = () => {
  const navigation = useNavigation();

  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    email: '',
    userName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    address: '',
    emergencyContact: '',
    role: 'employee',
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
    ['fname', 'lname', 'userName', 'phoneNumber', 'password', 'confirmPassword'].forEach((field) => {
      if (!formData[field]) {
        newErrors[field] = 'This field is required';
      }
    });

    // Validate email format
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Validate password
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Validate phone number (simple check for now)
    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showToast('error', 'Error', 'Please correct the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const response = await apiCall('/api/admin/employee', 'POST', formData);
      if (response.status === 'success') {
        showToast('success', 'Success', response.message);
        navigation.navigate('Menu');
      } else {
        showToast('error', 'Error', response.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error(error);
      showToast('error', 'Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoid bg={colors.bg}>
      <View style={styles.page}>
        <Card>
          <SectionHeader icon="users" title="Personal Details" />
          <View style={styles.field}>
            <TextField
              label="First Name"
              placeholder="First name"
              value={formData.fname}
              onChangeText={(v) => handleInputChange('fname', v)}
              leftIcon="account"
              error={errors.fname}
            />
          </View>
          <View style={styles.field}>
            <TextField
              label="Last Name"
              placeholder="Last name"
              value={formData.lname}
              onChangeText={(v) => handleInputChange('lname', v)}
              leftIcon="account"
              error={errors.lname}
            />
          </View>
          <View style={styles.field}>
            <TextField
              label="Email"
              placeholder="name@example.com"
              value={formData.email}
              onChangeText={(v) => handleInputChange('email', v)}
              leftIcon="email"
              keyboardType="email-address"
              error={errors.email}
            />
          </View>
          <View style={styles.field}>
            <TextField
              label="Username"
              placeholder="username"
              value={formData.userName}
              onChangeText={(v) => handleInputChange('userName', v)}
              leftIcon="user-circle"
              error={errors.userName}
            />
          </View>
          <View style={styles.field}>
            <TextField
              label="Phone Number"
              placeholder="10-digit phone number"
              value={formData.phoneNumber}
              onChangeText={(v) => handleInputChange('phoneNumber', v)}
              leftIcon="phone"
              keyboardType="phone-pad"
              error={errors.phoneNumber}
            />
          </View>
        </Card>

        <Card style={styles.cardGap}>
          <SectionHeader icon="lock" title="Credentials" />
          <View style={styles.field}>
            <TextField
              label="Password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChangeText={(v) => handleInputChange('password', v)}
              leftIcon="lock"
              secureTextEntry
              error={errors.password}
            />
          </View>
          <View style={styles.field}>
            <TextField
              label="Confirm Password"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChangeText={(v) => handleInputChange('confirmPassword', v)}
              leftIcon="lock-check"
              secureTextEntry
              error={errors.confirmPassword}
            />
          </View>
        </Card>

        <Card style={styles.cardGap}>
          <SectionHeader icon="account-tie" title="Address & Role" />
          <View style={styles.field}>
            <TextField
              label="Address"
              placeholder="Street, city, state"
              value={formData.address}
              onChangeText={(v) => handleInputChange('address', v)}
              leftIcon="pin"
              multiline
            />
          </View>
          <View style={styles.field}>
            <TextField
              label="Emergency Contact"
              placeholder="Emergency contact number"
              value={formData.emergencyContact}
              onChangeText={(v) => handleInputChange('emergencyContact', v)}
              leftIcon="phone-alert"
              keyboardType="phone-pad"
            />
          </View>
          <RolePicker
            value={formData.role}
            onValueChange={(v) => handleInputChange('role', v)}
          />
        </Card>

        <Button
          label="Register Employee"
          icon="user-plus"
          variant="accent"
          size="lg"
          full
          loading={loading}
          disabled={loading}
          onPress={handleSubmit}
        />
      </View>
      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  cardGap: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionChip: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...type.caption,
    color: colors.inkSecondary,
    marginBottom: 6,
  },
  pickerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.sm,
  },
  picker: {
    flex: 1,
    height: 52,
    color: colors.ink,
  },
});

export default EmployeeRegistration;
