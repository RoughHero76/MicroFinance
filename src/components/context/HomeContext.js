import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const HomeContext = createContext();

export const HomeProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [settings, setSettings] = useState(null);


    useEffect(() => {
        loadLoginState();
    }, []);

    const loginUser = async (userData) => {
        if (userData && userData.user) {
            setUser(userData.user);
            setUserRole(userData.user.role);
            setIsLoggedIn(true);
            try {
                await AsyncStorage.setItem('user', JSON.stringify(userData.user));
                await AsyncStorage.setItem('userRole', userData.user.role);
                if (userData.token) {
                    await AsyncStorage.setItem('token', userData.token);
                }
                await AsyncStorage.setItem('isLoggedIn', 'true');
            } catch (error) {
                console.error('Error saving user data:', error);
            }
        } else {
            console.error('Invalid user data provided to loginUser');
        }
    };


    const logoutUser = async () => {
        setUser(null);
        setUserRole(null);
        setIsLoggedIn(false);
        try {
            await AsyncStorage.multiRemove(['user', 'token', 'isLoggedIn', 'userRole']);
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    const loadLoginState = async () => {
        try {
            const [userValue, tokenValue, loginValue, roleValue] = await AsyncStorage.multiGet(['user', 'token', 'isLoggedIn', 'userRole']);
            if (userValue[1] !== null) {
                setUser(JSON.parse(userValue[1]));
                setUserRole(roleValue[1]);
                setIsLoggedIn(loginValue[1] === 'true');
            }
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading login state:', error);
            setIsLoading(false);
        }
    };

    const contextValue = {
        user,
        setUser,
        isLoading,
        setIsLoading,
        isLoggedIn,
        setIsLoggedIn,
        userRole,
        setUserRole,
        loadLoginState,
        loginUser,
        logoutUser
    };

    return (
        <HomeContext.Provider value={contextValue}>
            {children}
        </HomeContext.Provider>
    );
};

export const useHomeContext = () => useContext(HomeContext);