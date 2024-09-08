import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CustomToast, showToast } from '../../../components/toast/CustomToast';
import { apiCall } from '../../../components/api/apiUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useHomeContext } from '../../../components/context/HomeContext';

const LoginScreen = () => {
    const navigation = useNavigation();
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { loginUser, isLoggedIn, setIsLoggedIn } = useHomeContext();

    useEffect(() => {
        // Check if the user is already logged in
        AsyncStorage.getItem('token').then((token) => {
            if (token) {
                setIsLoggedIn(true);
                navigation.navigate('Home');
            }
        });
    }, []);

    const handleLogin = async () => {
        if (userName.trim() === '' || password.trim() === '') {
            showToast('error', 'Invalid Input', 'Username and password cannot be empty');
            return;
        }
    
        setIsLoading(true);
        try {
            // Call API to log in
            const response = await apiCall('/api/admin/login', 'POST', { userName, password });
            if (response?.status === 'success') {
                const { admin, token } = response;
    
                // Store token in AsyncStorage
                await AsyncStorage.setItem('token', token);
    
                // Call the loginUser method from HomeContext to set the logged-in user
                loginUser({ admin, token }); // Pass the entire response object
    
                showToast('success', 'Login Successful', 'You have logged in successfully');
                navigation.navigate('Home');
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
    
    const renderInput = (value, setValue, placeholder, secureTextEntry, icon) => (
        <View style={styles.inputContainer}>
            <MaterialCommunityIcons name={icon} size={24} color="#a0a0a0" style={styles.inputIcon} />
            <TextInput
                style={styles.input}
                onChangeText={setValue}
                value={value}
                placeholder={placeholder}
                placeholderTextColor="#a0a0a0"
                secureTextEntry={secureTextEntry}
            />
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
            <StatusBar barStyle="light-content" backgroundColor="#4c669f" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.content}
            >
                <Text style={styles.title}>Micro Finance Login</Text>
                <Text style={styles.subtitle}>Enter your username and password to login</Text>

                {renderInput(userName, setUserName, 'Enter Username', false, 'account')}
                {renderInput(password, setPassword, 'Enter Password', true, 'lock')}

                {renderButton('Login', handleLogin)}
            </KeyboardAvoidingView>
            <CustomToast />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1E2A38',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#ffffff',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#e0e0e0',
        textAlign: 'center',
        marginBottom: 30,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 25,
        paddingHorizontal: 15,
        marginBottom: 20,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        padding: 15,
        color: '#ffffff',
    },
    button: {
        backgroundColor: '#FFC107',
        paddingVertical: 15,
        borderRadius: 25,
        alignItems: 'center',
        elevation: 5,
        marginTop: 10,
    },
    buttonText: {
        color: '#192f6a',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default LoginScreen;
