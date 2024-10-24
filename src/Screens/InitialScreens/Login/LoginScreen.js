import React, { useState } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity, StatusBar, Image, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CustomToast, showToast } from '../../../components/toast/CustomToast';
import { apiCall } from '../../../components/api/apiUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useHomeContext } from '../../../components/context/HomeContext';
import AppLogo from '../../../assets/EviLogo.png';

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

    const toggleLoginType = () => setIsAdmin((prevState) => !prevState);

    const togglePasswordVisibility = () => setShowPassword((prevState) => !prevState);

    const renderInput = (value, setValue, placeholder, secureTextEntry, icon) => (
        <View style={styles.inputContainer}>
            <MaterialCommunityIcons name={icon} size={24} color="#6B7280" style={styles.inputIcon} />
            <TextInput
                style={styles.input}
                onChangeText={setValue}
                value={value}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={secureTextEntry && !showPassword}
            />
            {icon === 'lock' && (
                <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
                    <MaterialCommunityIcons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={24}
                        color="#6B7280"
                    />
                </TouchableOpacity>
            )}
        </View>
    );

    const renderButton = (title, onPress) => (
        <TouchableOpacity style={styles.button} onPress={onPress} disabled={isLoading}>
            {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <Text style={styles.buttonText}>{title}</Text>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <Image source={AppLogo} style={styles.logo} />

                <Text style={styles.subtitle}>Login as {isAdmin ? 'Admin' : 'Employee'}</Text>

                {renderInput(userName, setUserName, 'Enter Username', false, 'account')}
                {renderInput(password, setPassword, 'Enter Password', true, 'lock')}

                <TouchableOpacity onPress={toggleLoginType} style={styles.toggleButton}>
                    <Text style={styles.toggleText}>
                        Switch to {isAdmin ? 'Employee' : 'Admin'} Login
                    </Text>
                </TouchableOpacity>

                {renderButton('Login', handleLogin)}
            </KeyboardAvoidingView>
            <CustomToast />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1F2937', // Dark gray background
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: '90%',
        height: '10%',
        marginBottom: 30,
        resizeMode: 'contain',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#F3F4F6', // Light gray
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#D1D5DB', // Gray for subtitles
        marginBottom: 20,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#374151', // Darker gray for input background
        borderRadius: 25,
        paddingHorizontal: 15,
        marginBottom: 20,
        width: '100%',
    },
    eyeIcon: {
        padding: 10,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        padding: 15,
        color: '#F3F4F6', // Light text
    },
    button: {
        backgroundColor: '#10B981', // Green button
        paddingVertical: 15,
        borderRadius: 25,
        alignItems: 'center',
        elevation: 5,
        width: '100%',
        marginTop: 20,
    },
    buttonText: {
        color: '#FFFFFF', // White text
        fontSize: 18,
        fontWeight: 'bold',
    },
    toggleButton: {
        marginTop: 15,
    },
    toggleText: {
        color: '#9CA3AF', // Lighter gray for toggle text
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});

export default LoginScreen;
