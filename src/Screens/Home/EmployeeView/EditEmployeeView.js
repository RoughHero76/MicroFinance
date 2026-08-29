import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, Pressable } from 'react-native';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast, CustomToast } from '../../../components/toast/CustomToast';
import { useNavigation, useRoute } from '@react-navigation/native';
import Screen from '../../../design/components/Screen';
import Card from '../../../design/components/Card';
import Button from '../../../design/components/Button';
import TextField from '../../../design/components/TextField';
import EmptyState from '../../../design/components/EmptyState';
import Icon from '../../../design/Icon';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * EditEmployeeView — employee edit form rebuilt on the "Ink & Amber"
 * design system.
 *  - same behaviour: identical form defaults from route.params.employeeData
 *    (including the accountStatus defaulting), the exact required-field
 *    and password-match guards with their toasts, the same two PUT calls
 *    (/api/admin/employee?uid= then optional
 *    /api/admin/employee/password?uid= with { newPassword }) and the
 *    success path (toast + goBack)
 *  - presentation: section cards, design TextField / Button, a tinted
 *    "Account Active" switch row and a show/hide eye on the new password
 *  - fix: the original imported showToast but never rendered <CustomToast/>,
 *    so its toasts could never appear — the renderer is now mounted
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
    setFormData((prevState) => ({
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
      <Screen bg={colors.bg}>
        <EmptyState
          icon="person-off"
          title="No employee data provided"
          subtitle="Open this screen from an employee profile to edit details."
          style={{ flex: 1, justifyContent: 'center' }}
        />
      </Screen>
    );
  }

  const name = `${employeeData.fname || ''} ${employeeData.lname || ''}`.trim();

  return (
    <Screen scroll keyboardAvoid bg={colors.bg}>
      <View style={styles.page}>
        <Card>
          <SectionHeader icon="users" title="Employee Details" />
          <View style={styles.field}>
            <TextField
              label="First Name"
              placeholder="First name"
              value={formData.fname}
              onChangeText={(v) => handleChange('fname', v)}
              leftIcon="account"
            />
          </View>
          <View style={styles.field}>
            <TextField
              label="Last Name"
              placeholder="Last name"
              value={formData.lname}
              onChangeText={(v) => handleChange('lname', v)}
              leftIcon="account"
            />
          </View>
          <View style={styles.field}>
            <TextField
              label="Email"
              placeholder="name@example.com"
              value={formData.email}
              onChangeText={(v) => handleChange('email', v)}
              leftIcon="email"
              keyboardType="email-address"
            />
          </View>
          <View style={styles.field}>
            <TextField
              label="Username"
              placeholder="username"
              value={formData.userName}
              onChangeText={(v) => handleChange('userName', v)}
              leftIcon="user-circle"
            />
          </View>
          <View style={styles.field}>
            <TextField
              label="Phone Number"
              placeholder="10-digit phone number"
              value={formData.phoneNumber}
              onChangeText={(v) => handleChange('phoneNumber', v)}
              leftIcon="phone"
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.field}>
            <TextField
              label="Address"
              placeholder="Street, city, state"
              value={formData.address}
              onChangeText={(v) => handleChange('address', v)}
              leftIcon="pin"
              multiline
            />
          </View>
          <View style={styles.field}>
            <TextField
              label="Emergency Contact"
              placeholder="Emergency contact number"
              value={formData.emergencyContact}
              onChangeText={(v) => handleChange('emergencyContact', v)}
              leftIcon="phone-alert"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Icon name="user-check" size={18} color={colors.successInk} />
              <View style={{ marginLeft: spacing.sm }}>
                <Text style={[type.bodyBold, { color: colors.ink }]}>Account Active</Text>
                <Text style={[type.sub, { color: colors.inkMuted }]}>
                  {formData.accountStatus ? 'This employee can sign in' : 'This employee is inactive'}
                </Text>
              </View>
            </View>
            <Switch
              value={!!formData.accountStatus}
              onValueChange={(v) => handleChange('accountStatus', v)}
              trackColor={{ true: colors.accent, false: colors.borderStrong }}
              thumbColor={colors.white}
            />
          </View>
        </Card>

        <Card style={styles.cardGap}>
          <SectionHeader icon="lock" title="Reset Password (optional)" />
          <View style={styles.field}>
            <TextField
              label="New Password"
              placeholder="Leave blank to keep current password"
              value={newPassword}
              onChangeText={setNewPassword}
              leftIcon="lock"
              secureTextEntry={!showPassword}
              rightSlot={
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.inkMuted} />
                </Pressable>
              }
            />
          </View>
          <View style={styles.field}>
            <TextField
              label="Confirm New Password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              leftIcon="lock-check"
              secureTextEntry={!showPassword}
            />
          </View>
        </Card>

        <Button
          label="Update Employee"
          icon="check"
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    marginTop: spacing.xs,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
});

export default EditEmployeeView;
