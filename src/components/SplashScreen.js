import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Text, Animated, Easing } from 'react-native';
import { colors, type, spacing } from '../design/tokens';

/**
 * SplashScreen — brand mark, a pulsing loader, and footer branding.
 * Kept dependency-light: RN's own Animated (safe in tests) instead of a
 * per-dot hook loop, so each dot is an isolated, rules-of-hooks-clean component.
 */

const Dot = ({ delay }) => {
  const v = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.3, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: colors.accent,
          opacity: v,
          transform: [{ scale: v.interpolate({ inputRange: [0.3, 1], outputRange: [0.7, 1.3] }) }],
        },
      ]}
    />
  );
};

const SplashScreen = () => {
  const logo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logo, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 90,
        mass: 0.9,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = {
    opacity: logo,
    transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
  };

  return (
    <View style={styles.splashContainer}>
      <View style={styles.hero}>
        <Animated.Image source={require('../assets/EviLogo.png')} style={[styles.splashImage, logoStyle]} />
      </View>

      <View style={styles.loadingContainer}>
        <Dot delay={0} />
        <Dot delay={180} />
        <Dot delay={360} />
      </View>

      <View style={styles.branding}>
        <View style={styles.section}>
          <Image source={require('../assets/branding/76Groups.png')} style={styles.brandLogo} />
        </View>
        <View style={styles.section}>
          <Text style={styles.brandText}>© 2024-25 76Groups</Text>
          <Text style={styles.brandText}>Powered by 76Groups</Text>
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
    backgroundColor: colors.dark,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashImage: {
    width: '82%',
    height: 120,
    resizeMode: 'contain',
    marginBottom: spacing.xxl,
  },
  loadingContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 96,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 7,
  },
  branding: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  section: {
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  brandLogo: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  brandText: {
    ...type.micro,
    color: colors.onDarkMuted,
    textAlign: 'center',
  },
});

export default SplashScreen;
