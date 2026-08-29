import React, { useState } from 'react';
import {
    Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, StatusBar, Text, TextInput, View
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CustomToast, showToast } from '../../../components/toast/CustomToast';
import { apiCall } from '../../../components/api/apiUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useHomeContext } from '../../../components/context/HomeContext';
import { colors, spacing, tokens } from '../../../theme/tokens';
import { EviButton } from '../../../components/ui/EviButton';
import AppLogo from '../../../assets/EviLogo.png';

const ROLES = [
    { key: 'employee', label: 'Employee' },
    { key: 'admin', label: 'Admin' },
];

const LoginScreen = () => {
    const navigation = useNavigation();
    const [isLoading, setIsLoading] = useState(false);
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('employee');
    const [showPassword, setShowPassword] = useState(false);
    const { loginUser } = useHomeContext();

    const handleLogin = async () => {
        if (userName.trim() === '' || password.trim() === '') {
            showToast('error', 'Invalid Input', 'Username and password cannot be empty');
            return;
        }

        setIsLoading(true);
        try {
            const endpoint = role === 'admin' ? '/api/admin/login' : '/api/employee/auth/login';
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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.night} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <Image source={AppLogo} style={styles.logo} resizeMode="contain" />
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>Sign in to your Evi Finance workspace</Text>

                {/* Role toggle */}
                <View style={styles.segment}>
                    {ROLES.map((r) => {
                        const active = r.key === role;
                        return (
                            <Pressable
                                key={r.key}
                                onPress={() => setRole(r.key)}
                                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                            >
                                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                                    {r.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Username */}
                <View style={styles.inputRow}>
                    <MaterialCommunityIcons name="account-outline" size={22} color={colors.nightText} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        value={userName}
                        onChangeText={setUserName}
                        placeholder="Username"
                        placeholderTextColor={colors.nightText}
                        autoCapitalize="none"
                        autoCorrect={false}
                        textAlignVertical="center"
                    />
                </View>

                {/* Password */}
                <View style={styles.inputRow}>
                    <MaterialCommunityIcons name="lock-outline" size={22} color={colors.nightText} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Password"
                        placeholderTextColor={colors.nightText}
                        secureTextEntry={!showPassword}
                        textAlignVertical="center"
                        onSubmitEditing={handleLogin}
                    />
                    <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={12} accessibilityRole="button">
                        <MaterialCommunityIcons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={22}
                            color={colors.nightText}
                            style={styles.eye}
                        />
                    </Pressable>
                </View>

                <EviButton
                    title="Sign In"
                    icon="login"
                    onPress={handleLogin}
                    loading={isLoading}
                    style={styles.loginBtn}
                />

                <View style={styles.hintRow}>
                    <MaterialCommunityIcons name="shield-check-outline" size={14} color={colors.nightText} />
                    <Text style={styles.hint}>Secured for {role === 'admin' ? 'admin' : 'field'} accounts</Text>
                </View>
            </KeyboardAvoidingView>
            <CustomToast />
        </View>
    );
};

const { type } = tokens;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.night,
        paddingHorizontal: spacing.xl,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    logo: {
        width: 88,
        height: 88,
        alignSelf: 'center',
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: type.sizes.xxl,
        fontWeight: type.weights.bold,
        color: colors.white,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: type.sizes.md,
        color: colors.nightText,
        textAlign: 'center',
        marginTop: spacing.xs,
        marginBottom: spacing.xl,
    },
    segment: {
        flexDirection: 'row',
        backgroundColor: colors.nightSoft,
        borderRadius: tokens.radii.pill,
        padding: 4,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.nightLine,
    },
    segmentBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: tokens.radii.pill,
    },
    segmentBtnActive: {
        backgroundColor: colors.brand,
    },
    segmentText: {
        fontSize: type.sizes.md,
        fontWeight: type.weights.medium,
        color: colors.nightText,
    },
    segmentTextActive: {
        color: colors.white,
        fontWeight: type.weights.semibold,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.nightSoft,
        borderRadius: tokens.radii.md,
        borderWidth: 1,
        borderColor: colors.nightLine,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    inputIcon: {
        marginRight: spacing.sm,
    },
    input: {
        flex: 1,
        paddingVertical: 15,
        fontSize: type.sizes.md,
        color: colors.white,
    },
    eye: {
        padding: 6,
    },
    loginBtn: {
        marginTop: spacing.sm,
    },
    hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.lg,
    },
    hint: {
        fontSize: type.sizes.xs,
        color: colors.nightText,
        marginLeft: 6,
        opacity: 0.8,
    },
});

export default LoginScreen;
