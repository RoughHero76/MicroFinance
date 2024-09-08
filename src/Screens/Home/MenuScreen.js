import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from './HomeScreen.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHomeContext } from '../../components/context/HomeContext';

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
            <TouchableOpacity style={styles.profileButton}>
                <Icon name="account-circle" size={24} color="#000" />
            </TouchableOpacity>
        </View>
    );
};

const UserProfile = () => {
    const { user } = useHomeContext();

    return (
        <View style={styles.userContainer}>
            <View style={styles.profileContainer}>
                <View style={styles.profileIconContainer}>
                    <Icon name="account-circle" size={60} color="#4a4a4a" />
                </View>
                <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{`${user?.fname || 'Not'} ${user?.lname ||'Available'}  `}</Text>
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

            <MenuItem icon="account-cash" title="My Loans" onPress={() => console.log('My Loans pressed')} />
            <MenuItem icon="bank" title="Savings Account" onPress={() => console.log('Savings Account pressed')} />
            <MenuItem icon="cash-multiple" title="Transactions" onPress={() => console.log('Transactions pressed')} />
            <MenuItem icon="chart-line" title="Financial Reports" onPress={() => console.log('Financial Reports pressed')} />
            <MenuItem icon="calculator" title="Loan Calculator" onPress={() => console.log('Loan Calculator pressed')} />
            <MenuItem icon="handshake" title="Support" onPress={() => console.log('Support pressed')} />
            <MenuItem icon="cog" title="Settings" onPress={() => console.log('Settings pressed')} />
            <MenuItem icon="shield-check" title="Security" onPress={() => console.log('Security pressed')} />
            <MenuItem icon="bell-outline" title="Notifications" onPress={() => console.log('Notifications pressed')} />
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