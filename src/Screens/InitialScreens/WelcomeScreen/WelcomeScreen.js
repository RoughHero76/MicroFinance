import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Screen from '../../../design/components/Screen';
import Button from '../../../design/components/Button';
import Icon from '../../../design/Icon';
import { PopIn, FadeInUp } from '../../../design/motion';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * WelcomeScreen — brand hero on the dark "Ink" surface (matching the splash),
 * amber "Amber" accent for the name and CTA. Staggered reanimated entrance
 * (PopIn + FadeInUp) gives a small, tasteful bit of motion without a library.
 * Navigation behavior is unchanged: Get Started → Login.
 */

const FEATURES = [
  { icon: 'cash-multiple', label: 'Fast lending' },
  { icon: 'chart-line', label: 'Live insights' },
  { icon: 'shield-check', label: 'Bank-grade secure' },
];

const WelcomeScreen = () => {
  const navigation = useNavigation();

  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  return (
    <Screen bg={colors.dark}>
      <LinearGradient
        colors={[colors.dark, colors.darkAlt]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.body}>
        <PopIn style={{ marginBottom: spacing.xl }}>
          <Image source={require('../../../assets/EviLogo.png')} style={styles.logo} />
        </PopIn>

        <FadeInUp delay={80}>
          <Text style={styles.eyebrow}>WELCOME TO</Text>
          <Text style={styles.appName}>Evi Finance</Text>
          <Text style={styles.tagline}>Your journey begins here</Text>
        </FadeInUp>

        <FadeInUp delay={160} style={{ marginTop: spacing.xxl }}>
          <View style={styles.featureRow}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featureChip}>
                <Icon name={f.icon} size={16} color={colors.accent} />
                <Text style={styles.featureText} numberOfLines={1}>
                  {f.label}
                </Text>
              </View>
            ))}
          </View>
        </FadeInUp>

        <FadeInUp delay={240} style={{ marginTop: spacing.xxxl }}>
          <Button
            label="Get Started"
            variant="accent"
            size="lg"
            full
            onPress={handleGetStarted}
            testID="welcome-get-started"
            style={styles.cta}
          />
        </FadeInUp>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2024–25 76Groups · Powered by 76Groups</Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logo: {
    width: 190,
    height: 64,
    resizeMode: 'contain',
  },
  eyebrow: {
    ...type.caption,
    color: colors.onDarkMuted,
    letterSpacing: 2.4,
    textAlign: 'center',
  },
  appName: {
    ...type.display,
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  tagline: {
    ...type.body,
    color: colors.onDark,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.darkAlt,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  featureText: {
    ...type.caption,
    color: colors.onDark,
  },

  cta: {
    maxWidth: 280,
  },

  footer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  footerText: {
    ...type.micro,
    color: colors.onDarkMuted,
    textAlign: 'center',
  },
});

export default WelcomeScreen;
