import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  Easing,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { colors, spacing, tokens } from '../theme/tokens';

// One bouncing dot — its own component so hooks are used correctly.
const Dot = ({ delay = 0 }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelayLoop(delay);
  }, [progress, delay]);

  const style = useAnimatedStyle(() => {
    const t = progress.value; // 0 → 1 → 0
    return {
      opacity: 0.4 + 0.6 * t,
      transform: [{ scale: 0.7 + 0.4 * t }],
    };
  });

  return <Animated.View style={[styles.dot, style]} />;
};

// Starts after `delay` ms, then loops 0→1→0 forever (staggered dots).
function withDelayLoop(delay) {
  return withDelay(
    delay,
    withRepeat(
      withSequence(
        withTiming(1, { duration: 450, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 450, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    )
  );
}

const SplashScreen = () => {
  const logoProgress = useSharedValue(0);

  useEffect(() => {
    logoProgress.value = withSpring(1, { damping: 8, stiffness: 90 });
  }, [logoProgress]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(logoProgress.value, [0, 1], [0, 1]),
    transform: [{ scale: 0.6 + 0.4 * logoProgress.value }],
  }));

  return (
    <View style={styles.splashContainer}>
      <Animated.Image
        source={require('../assets/EviLogo.png')}
        style={[styles.splashImage, logoStyle]}
      />

      <View style={styles.loadingContainer}>
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>

      <View style={styles.branding}>
        <View style={styles.brandSection}>
          <Image source={require('../assets/branding/76Groups.png')} style={styles.brandLogo} resizeMode="contain" />
        </View>
        <View style={styles.brandSection}>
          <Text style={styles.brandText}>© 2024-25 76Groups</Text>
          <Text style={styles.brandText}>Powered by 76Groups</Text>
        </View>
      </View>
    </View>
  );
};

const { type } = tokens;

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.night,
  },
  splashImage: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
    marginBottom: spacing.xxl,
  },
  loadingContainer: {
    flexDirection: 'row',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.brandSoft,
    marginHorizontal: 6,
  },
  branding: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  brandSection: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  brandLogo: {
    width: 28,
    height: 28,
  },
  brandText: {
    fontSize: type.sizes.xs - 1,
    color: colors.nightText,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default SplashScreen;
