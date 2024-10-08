import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
  withSequence,
} from 'react-native-reanimated';

const SplashScreen = () => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const loadingProgress = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1000 });
    scale.value = withSpring(1, { damping: 6 });
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
        opacity: withTiming(
          delay,
          withRepeat(dotOpacity, -1, false)
        ),
        transform: [
          {
            scale: withRepeat(
              withSequence(
                withTiming(1.3, { duration: 450 }),
                withTiming(0.5, { duration: 250 })
              ),
              -1,
              false
            ),
          },
        ],
      };
    });

  const dot1Style = createDotStyle(0);
  const dot2Style = createDotStyle(300);
  const dot3Style = createDotStyle(600);

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

      <View style={styles.tradeMarkAndBranding}>
        <View style={styles.section}>
          <Animated.Image source={require('../assets/branding/76Groups.png')} style={[styles.logo, logoAnimatedStyle]} />
        </View>
        <View style={styles.section}>
          <Text style={styles.textStyle}>© 2024-25 76Groups</Text>
          <Text style={styles.textStyle}>Powered by 76Groups</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
  },
  splashImage: {
    width: '90%',
    height: '10%',
    resizeMode: 'contain',
    marginBottom: 20,
  },

  loadingContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 60,
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFDD00',
    marginHorizontal: 6,
  },

  //Brandings
  tradeMarkAndBranding: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10, // Adjusted for closer to the bottom
    justifyContent: 'center', // Center the content better
    alignItems: 'center',
    width: '100%', // Ensures it stretches the width for spacing control
  },
  logo: {
    width: 30, // Reduced size for smaller branding
    height: 30, // Reduced size for smaller branding
    resizeMode: 'contain',
  },
  section: {
    alignItems: 'center',
    marginHorizontal: 8, // Added margin to give slight spacing between sections
  },
  textStyle: {
    fontSize: 10, // Smaller font for subtle branding
    color: '#fff',
    textAlign: 'center',
  },
});


export default SplashScreen;