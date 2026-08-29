import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from './HomeScreen.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHomeContext } from '../../components/context/HomeContext';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, type, touchTarget } from '../../theme/tokens';
const Drawer = createDrawerNavigator();

const CustomHeader = ({ navigation }) => {
    const { user } = useHomeContext();
    return (
        <View style={styles.headerContainer}>
            <TouchableOpacity
                onPress={() => navigation.toggleDrawer()}
                style={styles.menuButton}
            >
                <Icon name="menu" size={24} color={colors.brand} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Evi Micro Finance</Text>

            <View style={styles.subHeader}>
                <TouchableOpacity style={styles.searchButton}
                    onPress={() => navigation.navigate('SearchScreen')}
                >
                    <Icon name="magnify" size={24} color={colors.ink} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('ProfileScreen')}>
                    {user.profilePic ? (
                        <Image
                            source={{ uri: user?.profilePic }}
                            style={styles.profileImage}
                            resizeMode="cover"
                            onError={() => console.log("Failed to load image")}
                        />
                    ) : (
                        <Icon name="account-circle" size={24} color={colors.ink} />
                    )}
                </TouchableOpacity>
            </View>

        </View>
    );
};

const UserProfile = () => {
    const { user } = useHomeContext();

    return (
        <View style={styles.userContainer}>
            <View style={styles.profileContainer}>
                <View style={styles.profileIconContainer}>
                    {user.profilePic ? (
                        <Image
                            source={{ uri: user?.profilePic }}
                            style={styles.profileImageLg}
                            resizeMode="cover"
                            onError={() => console.log("Failed to load image")}
                        />
                    ) : (
                        <Icon name="account-circle" size={60} color={colors.brand} />
                    )}
                </View>
                <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{`${user?.fname || 'Not'} ${user?.lname || 'Available'}  `}</Text>
                    <Text style={styles.profileEmail}>{user?.email || 'Not Available'}</Text>
                </View>
            </View>
        </View>
    );
};

const MenuItem = ({ icon, title, onPress }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <Icon name={icon} size={24} color={colors.brand} style={styles.menuIcon} />
        <Text style={styles.menuTitle}>{title}</Text>
        <Icon name="chevron-right" size={24} color={colors.inkFaint} />
    </TouchableOpacity>
);

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
        <ScrollView style={styles.drawerContent}>
            <UserProfile />

            <MenuItem icon="account-cash" title="Employees" onPress={() => navigation.navigate('AllEmployeeView')} />
            <MenuItem icon="cash-multiple" title="Payments" onPress={() => console.log('Transactions pressed')} />
            <MenuItem icon="chart-line" title="Reports" onPress={() => navigation.navigate('ReportsScreen')} />
            <MenuItem icon="calculator" title="Loan Calculator" onPress={() => navigation.navigate('LoanCalculator')} />
            <MenuItem icon="handshake" title="Support" onPress={() => console.log('Support pressed')} />
            <MenuItem icon="cog" title="Settings" onPress={() => console.log('Settings pressed')} />
            <MenuItem icon="shield-check" title="Security" onPress={() => console.log('Security pressed')} />
            <MenuItem icon="bell-outline" title="Notifications" onPress={() => console.log('Notifications pressed')} />
            {/* Menu Iem for About Page */}
            <MenuItem icon="information" title="About" onPress={() => navigation.navigate('About')} />
            <MenuItem icon="logout" title="Logout" onPress={handleLogout} />
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
                    width: '70%',
                    backgroundColor: colors.card,
                },
                drawerActiveTintColor: colors.brand,
                drawerInactiveTintColor: colors.inkSoft,

            })}


        >
            <Drawer.Screen name="Home" component={HomeScreen} />
        </Drawer.Navigator>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    subHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchButton: {
        padding: spacing.md,
        marginRight: spacing.xs,
    },
    menuButton: {
        padding: spacing.md,
    },
    headerTitle: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.semibold,
        color: colors.ink,
    },
    profileButton: {
        padding: spacing.md,
    },
    profileImage: {
        width: 36,
        height: 36,
        borderRadius: radii.pill,
        marginRight: spacing.md,
    },
    profileImageLg: {
        width: 60,
        height: 60,
        borderRadius: radii.pill,
    },
    drawerContent: {
        flex: 1,
        backgroundColor: colors.card,
    },
    userContainer: {
        backgroundColor: colors.brandTint,
        padding: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.brandSoft,
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileIconContainer: {
        marginRight: spacing.lg,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: type.sizes.lg,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    profileEmail: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginTop: spacing.xs,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        minHeight: touchTarget,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    menuIcon: {
        marginRight: spacing.lg,
    },
    menuTitle: {
        flex: 1,
        fontSize: type.sizes.md,
        fontWeight: type.weights.medium,
        color: colors.ink,
    },
});

export default MenuScreen;
