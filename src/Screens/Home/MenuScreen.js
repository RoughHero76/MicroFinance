import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from './HomeScreen.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHomeContext } from '../../components/context/HomeContext';
import { useNavigation } from '@react-navigation/native';
import { Menu } from 'react-native-paper';
const Drawer = createDrawerNavigator();

const CustomHeader = ({ navigation }) => {
    const { user } = useHomeContext();
    return (
        <View style={styles.headerContainer}>
            <TouchableOpacity
                onPress={() => navigation.toggleDrawer()}
                style={styles.menuButton}
            >
                <Icon name="menu" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Evi Micro Finance</Text>

            <View style={styles.subHeader}>
                <TouchableOpacity style={styles.searchButton}
                    onPress={() => navigation.navigate('SearchScreen')}
                >
                    <Icon name="magnify" size={24} color="#000" />
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
                        <Icon name="account-circle" size={24} color="#000" />
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
                            style={styles.profileImage}
                            resizeMode="cover"
                            onError={() => console.log("Failed to load image")}
                        />
                    ) : (
                        <Icon name="account-circle" size={60} color="#000" />
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
        <Icon name={icon} size={24} color="#4a4a4a" style={styles.menuIcon} />
        <Text style={styles.menuTitle}>{title}</Text>
        <Icon name="chevron-right" size={24} color="#4a4a4a" />
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
                },
                drawerActiveTintColor: '#007AFF',
                drawerInactiveTintColor: '#000',

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
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 5,
        backgroundColor: '#fff',
    },
    subHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchButton: {
        padding: 5,
        marginRight: 10,
    },
    menuButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'black',
    },
    profileButton: {
        padding: 5,
    },
    profileImage: {
        width: 36,
        height: 36,
        borderRadius: 40,
        marginRight: 15,
    },
    drawerContent: {
        flex: 1,
    },
    userContainer: {
        backgroundColor: '#f0f0f0',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileIconContainer: {
        marginRight: 16,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4a4a4a',
    },
    profileEmail: {
        fontSize: 14,
        color: '#666',

    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    menuIcon: {
        marginRight: 16,
    },
    menuTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4a4a4a',
    },
});

export default MenuScreen;