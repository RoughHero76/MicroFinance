import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const WelcomeScreen = () => {
    const navigation = useNavigation();

    const handleGetStarted = () => {
        navigation.navigate('Login');
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1e3c72" />
            <View style={styles.content}>
                <Text style={styles.welcomeText}>Welcome to</Text>
                <Text style={styles.appName}>Evi Finance</Text>
                <Text style={styles.tagline}>
                    Your journey begins here
                </Text>
                <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
                    <Text style={styles.getStartedButtonText}>Get Started</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1F2937'
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: '300',
        color: '#ffffff',
        marginBottom: 10,
    },
    appName: {
        color: '#FFC107',
        fontSize: 48,
        fontWeight: 'bold',
        marginBottom: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: -1, height: 1},
        textShadowRadius: 10
    },
    tagline: {
        fontSize: 18,
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 40,
        fontStyle: 'italic',
    },
    getStartedButton: {
        backgroundColor: '#FFC107',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
        elevation: 5,
    },
    getStartedButtonText: {
        color: '#1e3c72',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default WelcomeScreen;