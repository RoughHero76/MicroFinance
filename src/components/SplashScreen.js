// components/SplashScreen.js
import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withRepeat,
    withSequence,
    Easing,
} from 'react-native-reanimated';

const SplashScreen = () => {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);
    const loadingProgress = useSharedValue(0);

    useEffect(() => {
        opacity.value = withTiming(1, { duration: 1000 });
        scale.value = withSpring(1, { damping: 4 });
        loadingProgress.value = withRepeat(
            withTiming(1, { duration: 1500, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const logoAnimatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    const createDotStyle = (delay) =>
        useAnimatedStyle(() => {
            const dotOpacity = withSequence(
                withTiming(1, { duration: 500, easing: Easing.linear }),
                withTiming(0.3, { duration: 500, easing: Easing.linear })
            );

            return {
                opacity: withRepeat(dotOpacity, -1, false),
                transform: [
                    {
                        scale: withRepeat(
                            withSequence(
                                withTiming(1.2, { duration: 250 }),
                                withTiming(1, { duration: 250 })
                            ),
                            -1,
                            false
                        ),
                    },
                ],
            };
        });

    const dot1Style = createDotStyle(0);
    const dot2Style = createDotStyle(500);
    const dot3Style = createDotStyle(1000);

    return (
        <View style={styles.splashContainer}>
            <Animated.Image
                source={require('../assets/EviLogo.png')}
                style={[styles.splashImage, logoAnimatedStyle]}
            />

            <View style={styles.loadingContainer}>
                <Animated.View style={[styles.loadingDot, dot1Style]} />
                <Animated.View style={[styles.loadingDot, dot2Style]} />
                <Animated.View style={[styles.loadingDot, dot3Style]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    splashContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1E2A38',
    },
    splashImage: {
        width: 350,
        height: 350,
        resizeMode: 'contain',
    },
    appName: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginTop: 20,
    },
    loadingContainer: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 50,
    },
    loadingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FFFFFF',
        marginHorizontal: 5,
    },
});

export default SplashScreen;