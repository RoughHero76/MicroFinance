// src/components/toast/CustomToast.js

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Toast from "react-native-toast-message";
import Icon from 'react-native-vector-icons/MaterialIcons';

export const showToast = (type, text1, text2) => {
    Toast.show({ type, text1, text2 });
}

const ToastMessage = ({ type, text1, text2 }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    return (
        <Animated.View style={[styles.toastContainer, styles[`${type}Toast`], { opacity: fadeAnim }]}>
            <Icon
                name={type === 'success' ? "check-circle" : "error"}
                size={24}
                color="white"
                style={styles.toastIcon}
            />
            <View style={styles.divider} />
            <View style={styles.textContainer}>
                <Text style={styles.toastText1}>{text1}</Text>
                <Text style={styles.toastText2}>{text2}</Text>
            </View>
        </Animated.View>
    );
};

export const CustomToast = () => (
    <Toast
        config={{
            success: ({ text1, text2 }) => <ToastMessage type="success" text1={text1} text2={text2} />,
            error: ({ text1, text2 }) => <ToastMessage type="error" text1={text1} text2={text2} />,
        }}
    />
);

const styles = StyleSheet.create({
    toastContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
        marginHorizontal: 20,
        marginVertical: 10,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    successToast: {
        backgroundColor: '#28a745',
    },
    errorToast: {
        backgroundColor: '#dc3545',
    },
    toastIcon: {
        marginRight: 10,
    },
    divider: {
        width: 1,
        height: '100%',
        backgroundColor: 'white',
        marginHorizontal: 10,
    },
    textContainer: {
        flex: 1,
    },
    toastText1: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    toastText2: {
        color: 'white',
        fontSize: 14,
    },
});

export default CustomToast;
