import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast, CustomToast } from '../../../components/toast/CustomToast';
import { useNavigation, useRoute } from '@react-navigation/native';
import Screen from '../../../design/components/Screen';
import Button from '../../../design/components/Button';
import TextField from '../../../design/components/TextField';
import Icon from '../../../design/Icon';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * EditCustomerScreen — pre-filled customer form rebuilt on the "Ink & Amber"
 * design system, mirroring CustomerRegistration so the two read as one
 * surface. Original behaviour preserved: fields seed from route params,
 * `PUT /api/admin/customer?uid=…`, success toast + goBack.
 */

const SectionLabel = ({ children, first }) => (
  <Text
    style={[
      type.caption,
      {
        color: colors.inkMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: spacing.sm,
        marginTop: first ? 0 : spacing.xl,
      },
    ]}
  >
    {children}
  </Text>
);

const GenderPicker = ({ value, onChange }) => (
  <View style={{ marginBottom: spacing.md }}>
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

const EditCustomerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { customerData } = route.params || {};

  const [formData, setFormData] = useState({
    fname: customerData?.fname || '',
    lname: customerData?.lname || '',
    gender: customerData?.gender || '',
    email: customerData?.email || '',
    userName: customerData?.userName || '',
    phoneNumber: customerData?.phoneNumber || '',
    address: customerData?.address || '',
    city: customerData?.city || '',
    state: customerData?.state || '',
    country: customerData?.country || '',
    pincode: customerData?.pincode || '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (name, value) => {
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, placeholder, icon, props = {}) => (
    <TextField
      label={label}
      value={formData[name]}
      onChangeText={(text) => handleChange(name, text)}
      placeholder={placeholder}
      leftIcon={icon}
      style={{ marginBottom: spacing.md }}
      {...props}
    />
  );

  return (
    <Screen scroll bg={colors.bg} keyboardAvoid keyboardShouldPersistTaps="handled">
      <View style={styles.page}>
        <SectionLabel first>Personal Details</SectionLabel>
        {field('fname', 'First Name', 'First name', 'account')}
        {field('lname', 'Last Name', 'Last name', 'user')}
        <GenderPicker value={formData.gender} onChange={(v) => handleChange('gender', v)} />

        <SectionLabel>Contact</SectionLabel>
        {field('email', 'Email', 'name@example.com', 'email', { keyboardType: 'email-address' })}
        {field('userName', 'Username', 'Username', 'user-circle')}
        {field('phoneNumber', 'Phone Number', '10-digit mobile number', 'phone', { keyboardType: 'phone-pad' })}

        <SectionLabel>Address</SectionLabel>
        {field('address', 'Address', 'Street / locality', 'home', { multiline: true })}
        {field('city', 'City', 'City', 'city')}
        {field('state', 'State', 'State', 'map-marker')}
        {field('country', 'Country', 'Country', 'earth')}
        {field('pincode', 'Pincode', 'Pincode', 'pin', { keyboardType: 'numeric' })}

        <View style={{ marginTop: spacing.xl }}>
          <Button
            label="Update Customer"
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

export default EditCustomerScreen;
