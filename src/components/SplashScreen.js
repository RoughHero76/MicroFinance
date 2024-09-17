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
                withTiming(1.3, { duration: 250 }),
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
    bottom: 60, // Adjusted for better spacing
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFDD00', // Matching accent color
    marginHorizontal: 6,
  },
});

export default SplashScreen;