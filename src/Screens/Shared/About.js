import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { useUpdateContext } from '../../components/context/UpdateContext';
import { getVersion } from 'react-native-device-info';
import AppLogo from '../../assets/branding/76Groups.png';
import Screen from '../../design/components/Screen';
import Card from '../../design/components/Card';
import Button from '../../design/components/Button';
import Icon from '../../design/Icon';
import { colors, spacing, radius, type } from '../../design/tokens';

/**
 * About — app identity + update check, rebuilt on the "Ink & Amber"
 * design system.
 *  - same behaviour: version via react-native-device-info, forced
 *    checkForUpdates(true) on load, the same update/progress states and
 *    the exact legal copy
 *  - the raw RN Button is replaced with the design Button; layout is a
 *    centered identity card + legal card instead of a loose stack
 */

const About = () => {
  const {
    updateAvailable, latestVersion, downloadUpdate,
    downloading, downloadProgress, checkForUpdates,
  } = useUpdateContext();
  const [currentVersion, setCurrentVersion] = useState('');

  useEffect(() => {
    const fetchVersionAndUpdate = async () => {
      const version = getVersion();
      setCurrentVersion(version);

      // Force an update check when the About page loads
      await checkForUpdates(true);
    };
    fetchVersionAndUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = () => {
    if (updateAvailable) {
      downloadUpdate();
    } else {
      Alert.alert('No Updates', 'Your app is up to date!');
    }
  };

  return (
    <Screen scroll bg={colors.bg}>
      <View style={styles.container}>
        <Card>
          <Image source={AppLogo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>About 76Softwares</Text>
          <View style={styles.versionRow}>
            <View style={styles.versionChip}>
              <Icon name="information" size={14} color={colors.accentDeep} />
            </View>
            <Text style={styles.versionText}>Current Version: {currentVersion || '…'}</Text>
          </View>

          {updateAvailable ? (
            <Card style={styles.updateCard}>
              <View style={styles.updateRow}>
                <Icon name="refresh" size={20} color={colors.accentDeep} />
                <Text style={styles.updateText}>
                  A new version {latestVersion || ''} is available!
                </Text>
              </View>
              {downloading ? (
                <View style={styles.progressRow}>
                  <Text style={styles.progressText}>
                    Downloading update: {downloadProgress}%
                  </Text>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              ) : (
                <Button
                  label="Download Update"
                  icon="download"
                  variant="accent"
                  full
                  style={{ marginTop: spacing.sm }}
                  onPress={handleDownload}
                />
              )}
            </Card>
          ) : (
            <View style={styles.updateRow}>
              <Icon name="check-circle-outline" size={18} color={colors.successInk} />
              <Text style={[styles.updateText, { color: colors.successInk }]}>
                Your app is up to date.
              </Text>
            </View>
          )}
        </Card>

        <Card style={styles.legalCard}>
          <Text style={styles.legalTitle}>Legal Terms &amp; Conditions</Text>
          <Text style={styles.legalText}>
            This software is the property of 76Softwares. Unauthorized copying, distribution, or
            modification of this app is strictly prohibited. By using this software, you agree to
            comply with all applicable copyright laws. Violation of these terms may result in legal
            action.
          </Text>
        </Card>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...type.h1,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  versionChip: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionText: {
    ...type.sub,
    color: colors.inkSecondary,
  },
  updateCard: {
    backgroundColor: colors.accentSoft,
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  updateText: {
    ...type.body,
    color: colors.inkSecondary,
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  progressText: {
    ...type.sub,
    color: colors.inkSecondary,
  },
  legalCard: {
    marginTop: spacing.md,
  },
  legalTitle: {
    ...type.title,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  legalText: {
    ...type.sub,
    color: colors.inkSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default About;
