// Compatibility layer for the old screens. The session now lives in
// src/features/auth/SessionProvider; this exposes it under the old names
// until those screens are replaced (removed in W6).

import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { setUnauthorizedHandler } from "../api/apiUtils";
import { useSession } from "@/features/auth/SessionProvider";
import { listEmployees, staffKeys } from "@/features/staff/api";

export const HomeContext = createContext();

const noop = () => {};

export const HomeProvider = ({ children }) => {
    const session = useSession();
    const isAdmin = session.status === 'signedIn' && session.role === 'admin';

    // One cached employee list shared by every picker (was fetched at login).
    const employeesQuery = useQuery({
        queryKey: staffKeys.list(),
        queryFn: listEmployees,
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    // Old screens still call apiCall(); its session-ended 401s end the
    // shared session too.
    useEffect(() => {
        setUnauthorizedHandler((message) => {
            session.signOut(message === 'Your account was deactivated' ? 'deactivated' : 'expired');
        });
        return () => setUnauthorizedHandler(null);
    }, [session.signOut]);

    const value = useMemo(() => ({
        user: session.user,
        setUser: (user) => session.updateUser(user),
        isLoading: session.status === 'loading',
        setIsLoading: noop,
        isLoggedIn: session.status === 'signedIn',
        setIsLoggedIn: noop,
        userRole: session.role,
        setUserRole: noop,
        loadLoginState: noop,
        loginUser: ({ user, token }) => session.signIn(user, token),
        logoutUser: () => session.signOut(),
        logoutReason: session.logoutReason,
        setLogoutReason: () => session.clearLogoutReason(),
        employees: isAdmin ? (employeesQuery.data ?? null) : null,
    }), [session, isAdmin, employeesQuery.data]);

    return (
        <HomeContext.Provider value={value}>
            {children}
        </HomeContext.Provider>
    );
};

export const useHomeContext = () => useContext(HomeContext);
