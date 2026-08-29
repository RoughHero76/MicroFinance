import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import HomeScreen from './HomeScreen.js';
import { useHomeContext } from '../../components/context/HomeContext';
import Icon from '../../design/Icon';
import { colors, spacing, radius, type } from '../../design/tokens';

const Drawer = createDrawerNavigator();

/**
 * Admin shell. Rebuilt on the "Ink & Amber" design system:
 *  - custom top bar (menu / title / search / avatar) instead of the old flat header
 *  - a grouped, icon-tiled drawer with a user hero and a clearly-marked danger Logout
 *  - RN core SafeAreaView for top insets (no provider dependency, safe in tests)
 * Navigation targets and placeholder handlers are preserved from the original so
 * nothing that used to work stops working.
 */

const IconBtn = ({ icon, onPress, size = 22, tint = colors.ink, bg = colors.surfaceAlt, style }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    style={[styles.iconBtn, { backgroundColor: bg }, style]}
  >
    <Icon name={icon} size={size} color={tint} />
  </TouchableOpacity>
);

const CustomHeader = ({ navigation }) => {
  const { user } = useHomeContext();

  return (
    <SafeAreaView edges={['top']} style={styles.header}>
      <View style={styles.headerRow}>
        <IconBtn icon="menu" onPress={() => navigation.toggleDrawer()} />
        <Text style={styles.headerTitle} numberOfLines={1}>
          Evi Micro Finance
        </Text>
        <View style={styles.headerActions}>
          <IconBtn icon="magnify" onPress={() => navigation.navigate('SearchScreen')} />
          <TouchableOpacity
            onPress={() => navigation.navigate('ProfileScreen')}
            activeOpacity={0.7}
            accessibilityRole="button"
            style={styles.avatarBtn}
          >
            {user?.profilePic ? (
              <Image source={{ uri: user.profilePic }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <Icon name="account-circle" size={22} color={colors.inkSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const UserProfile = () => {
  const { user } = useHomeContext();
  const name = `${user?.fname || ''} ${user?.lname || ''}`.trim();

  return (
    <SafeAreaView edges={['top']} style={styles.profileHero}>
      <View style={styles.profileRow}>
        <View style={styles.avatarWrap}>
          {user?.profilePic ? (
            <Image source={{ uri: user.profilePic }} style={styles.avatarLg} resizeMode="cover" />
          ) : (
            <Icon name="account-circle" size={34} color={colors.accentInk} />
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>
            {name || 'Administrator'}
          </Text>
          <Text style={styles.profileEmail} numberOfLines={1}>
            {user?.email || 'Not available'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const MenuItem = ({ icon, title, onPress, tone }) => {
  const danger = tone === 'danger';
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
    >
      <View style={[styles.menuIconWrap, { backgroundColor: danger ? colors.dangerSoft : colors.surfaceAlt }]}>
        <Icon name={icon} size={20} color={danger ? colors.dangerInk : colors.inkSecondary} />
      </View>
      <Text style={[styles.menuTitle, { color: danger ? colors.dangerInk : colors.ink }]}>{title}</Text>
      <Icon name="chevron-right" size={18} color={colors.borderStrong} />
    </TouchableOpacity>
  );
};

const SectionLabel = ({ children }) => <Text style={styles.sectionLabel}>{children}</Text>;

const CustomDrawerContent = ({ navigation }) => {
  const { setIsLoggedIn } = useHomeContext();

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      setIsLoggedIn(false);
      navigation.closeDrawer();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <ScrollView
      style={styles.drawer}
      contentContainerStyle={styles.drawerInner}
      showsVerticalScrollIndicator={false}
    >
      <UserProfile />

      <SectionLabel>Menu</SectionLabel>
      <MenuItem icon="account-cash" title="Employees" onPress={() => navigation.navigate('AllEmployeeView')} />
      <MenuItem icon="cash-multiple" title="Payments" onPress={() => console.log('Payments pressed')} />
      <MenuItem icon="chart-line" title="Reports" onPress={() => navigation.navigate('ReportsScreen')} />
      <MenuItem icon="calculator" title="Loan Calculator" onPress={() => navigation.navigate('LoanCalculator')} />

      <SectionLabel>Workspace</SectionLabel>
      <MenuItem icon="handshake" title="Support" onPress={() => console.log('Support pressed')} />
      <MenuItem icon="cog" title="Settings" onPress={() => console.log('Settings pressed')} />
      <MenuItem icon="shield-check" title="Security" onPress={() => console.log('Security pressed')} />
      <MenuItem icon="bell-outline" title="Notifications" onPress={() => console.log('Notifications pressed')} />

      <SectionLabel>Account</SectionLabel>
      <MenuItem icon="information" title="About" onPress={() => navigation.navigate('About')} />
      <MenuItem icon="logout" title="Logout" tone="danger" onPress={handleLogout} />

      <View style={styles.drawerFooter}>
        <Text style={styles.drawerFooterText}>Evi Micro Finance</Text>
      </View>
    </ScrollView>
  );
};

const MenuScreen = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        header: () => <CustomHeader navigation={navigation} />,
        drawerStyle: {
          width: '72%',
          backgroundColor: colors.surface,
          borderEndWidth: 1,
          borderEndColor: colors.border,
        },
      })}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  headerTitle: {
    ...type.title,
    color: colors.ink,
    flex: 1,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    marginLeft: spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
  },

  profileHero: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarLg: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...type.h2,
    color: colors.ink,
  },
  profileEmail: {
    ...type.sub,
    color: colors.inkMuted,
    marginTop: 2,
  },

  drawer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  drawerInner: {
    paddingBottom: spacing.xxxl,
  },
  sectionLabel: {
    ...type.caption,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuTitle: {
    ...type.body,
    fontWeight: '600',
    flex: 1,
  },
  drawerFooter: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  drawerFooterText: {
    ...type.micro,
    color: colors.inkMuted,
  },
});

export default MenuScreen;
