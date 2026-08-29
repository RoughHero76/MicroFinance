import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CustomToast, showToast } from '../../../components/toast/CustomToast';
import { apiCall } from '../../../components/api/apiUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHomeContext } from '../../../components/context/HomeContext';
import AppLogo from '../../../assets/EviLogo.png';
import Screen from '../../../design/components/Screen';
import Button from '../../../design/components/Button';
import TextField from '../../../design/components/TextField';
import Icon from '../../../design/Icon';
import { PopIn, FadeInUp } from '../../../design/motion';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * LoginScreen — rebuilt on the "Ink & Amber" design system.
 *  - design-system TextField (leading icons, focus states, inline errors)
 *  - amber segmented Admin/Employee switcher instead of a text link
 *  - design Button with loading state + press feedback
 *  - staggered entrance via reanimated FadeInUp/PopIn (motion.js)
 * All original logic (endpoints, token storage, context, toasts) is preserved.
 */

const RoleSwitch = ({ isAdmin, onChange }) => {
  const segment = (label, icon, active, onPress) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.roleSegment, active && styles.roleSegmentActive]}
    >
      <Icon
        name={icon}
        size={15}
        color={active ? colors.accentInk : colors.inkSecondary}
      />
      <Text
        numberOfLines={1}
        style={[styles.roleSegmentText, { color: active ? colors.accentInk : colors.inkSecondary }]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.roleSwitch}>
      {segment('Admin', 'shield-check', isAdmin, () => onChange(true))}
      {segment('Employee', 'user', !isAdmin, () => onChange(false))}
    </View>
  );
};

const LoginScreen = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { loginUser } = useHomeContext();

  const handleLogin = async () => {
    if (userName.trim() === '' || password.trim() === '') {
      showToast('error', 'Invalid Input', 'Username and password cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isAdmin ? '/api/admin/login' : '/api/employee/auth/login';
      const response = await apiCall(endpoint, 'POST', { userName, password });
      console.log('Login response:', response);
      if (response?.status === 'success') {
        const { user, token } = response;
        await AsyncStorage.setItem('token', token);
        loginUser({ user, token });

        showToast('success', 'Login Successful', 'You have logged in successfully');
      } else {
        showToast('error', 'Login Failed', response.message || 'Unable to log in');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'There was an error during login.';
      showToast('error', 'Login Error', errorMessage);
      console.error('Error during login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  return (
    <Screen keyboardAvoid bg={colors.bg}>
      <View style={styles.body}>
        <PopIn style={{ marginBottom: spacing.xxl }}>
          <Image source={AppLogo} style={styles.logo} />
        </PopIn>

        <FadeInUp delay={60}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subhead}>
            Sign in to continue to Evi Micro Finance
          </Text>
        </FadeInUp>

        <FadeInUp delay={120} style={{ marginTop: spacing.xl }}>
          <RoleSwitch isAdmin={isAdmin} onChange={setIsAdmin} />
        </FadeInUp>

        <FadeInUp delay={180} style={{ marginTop: spacing.lg }}>
          <TextField
            label="Username"
            value={userName}
            onChangeText={setUserName}
            placeholder="Enter username"
            leftIcon="account"
            testID="login-username"
          />
          <View style={styles.fieldGap} />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            leftIcon="lock"
            secureTextEntry={!showPassword}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            rightSlot={
              <Pressable
                onPress={togglePasswordVisibility}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.inkSecondary}
                />
              </Pressable>
            }
            testID="login-password"
          />
        </FadeInUp>

        <FadeInUp delay={240} style={{ marginTop: spacing.xl }}>
          <Button
            label={isAdmin ? 'Sign in as Admin' : 'Sign in as Employee'}
            variant="accent"
            size="lg"
            full
            loading={isLoading}
            disabled={!userName.trim() || !password.trim()}
            onPress={handleLogin}
            testID="login-submit"
          />
        </FadeInUp>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2024–25 76Groups · Powered by 76Groups</Text>
      </View>

      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logo: {
    width: 200,
    height: 72,
    resizeMode: 'contain',
  },
  heading: {
    ...type.display,
    color: colors.ink,
    textAlign: 'center',
  },
  subhead: {
    ...type.body,
    color: colors.inkSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  roleSwitch: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 3,
  },
  roleSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.full,
    gap: 6,
  },
  roleSegmentActive: {
    backgroundColor: colors.accent,
  },
  roleSegmentText: {
    ...type.bodyBold,
  },

  fieldGap: {
    height: spacing.md,
  },

  footer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  footerText: {
    ...type.micro,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});

export default LoginScreen;
