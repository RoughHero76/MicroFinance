import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast, CustomToast } from '../../../components/toast/CustomToast';
import Screen from '../../../design/components/Screen';
import Button from '../../../design/components/Button';
import TextField from '../../../design/components/TextField';
import Icon from '../../../design/Icon';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * CustomerRegistration — rebuilt on the "Ink & Amber" design system.
 *  - grouped form (Personal / Contact / Address) using design TextFields
 *    with leading icons, a styled gender Picker matching the field chrome,
 *    and an accent submit button with loading state
 *  - original payload (fname…pincode) and `POST /api/admin/customer` kept
 *    exactly; success still routes to Menu
 *  - icon names swapped to the verified custom SVG set (flag→earth,
 *    postage-stamp→pin)
 */

const SectionLabel = ({ children }) => (
  <Text
    style={[
      type.caption,
      {
        color: colors.inkMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
      },
    ]}
  >
    {children}
  </Text>
);

const GenderPicker = ({ value, onChange }) => (
  <View>
    <Text style={[type.caption, { color: colors.inkSecondary, marginBottom: 6 }]}>Gender</Text>
    <View style={styles.pickerWrap}>
      <Icon name="users" size={20} color={colors.inkMuted} />
      <Picker
        selectedValue={value || undefined}
        onValueChange={(itemValue) => onChange(itemValue)}
        style={[styles.picker, value === '' && { color: colors.inkMuted }]}
      >
        <Picker.Item label="Select Gender" value="" />
        <Picker.Item label="Male" value="Male" />
        <Picker.Item label="Female" value="Female" />
        <Picker.Item label="Other" value="Other" />
      </Picker>
      <Icon name="chevron-down" size={18} color={colors.inkMuted} />
    </View>
  </View>
);

const CustomerRegistration = () => {
  const navigation = useNavigation();

  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    gender: '',
    email: '',
    userName: '',
    phoneNumber: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
  });

  const [loading, setLoading] = useState(false);

  const handleInputChange = (name, value) => {
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await apiCall('/api/admin/customer', 'POST', formData);
      if (response.status === 'success') {
        showToast('success', 'Success', response.message);
        navigation.navigate('Menu');
      } else {
        showToast('error', 'Error', response.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error(error);
      showToast('error', 'Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, placeholder, icon, props = {}) => (
    <TextField
      label={label}
      value={formData[name]}
      onChangeText={(text) => handleInputChange(name, text)}
      placeholder={placeholder}
      leftIcon={icon}
      style={{ marginBottom: spacing.md }}
      {...props}
    />
  );

  return (
    <Screen scroll bg={colors.bg} keyboardAvoid keyboardShouldPersistTaps="handled">
      <View style={styles.page}>
        <SectionLabel>Personal Details</SectionLabel>
        {field('fname', 'First Name', 'First name', 'account')}
        {field('lname', 'Last Name', 'Last name', 'user')}
        <View style={{ marginBottom: spacing.md }}>
          <GenderPicker value={formData.gender} onChange={(v) => handleInputChange('gender', v)} />
        </View>

        <SectionLabel>Contact</SectionLabel>
        {field('email', 'Email', 'name@example.com', 'email', { keyboardType: 'email-address' })}
        {field('userName', 'Username', 'Username', 'user-circle')}
        {field('phoneNumber', 'Phone Number', '10-digit mobile number', 'phone', { keyboardType: 'phone-pad' })}

        <SectionLabel>Address</SectionLabel>
        {field('address', 'Address', 'Street / locality', 'home')}
        {field('city', 'City', 'City', 'city')}
        {field('state', 'State', 'State', 'map-marker')}
        {field('country', 'Country', 'Country', 'earth')}
        {field('pincode', 'Pincode', 'Pincode', 'pin', { keyboardType: 'numeric' })}

        <View style={{ marginTop: spacing.xl }}>
          <Button
            label="Register Customer"
            icon="check-circle"
            variant="accent"
            size="lg"
            full
            loading={loading}
            onPress={handleSubmit}
          />
        </View>
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
    height: 54,
    color: colors.ink,
  },
});

export default CustomerRegistration;
