import axios from 'axios';
import { API_URL } from './secrets';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 401 messages that mean the session itself is no longer valid. Other 401s
// (e.g. "Current password is incorrect", bad login) must not log anyone out.
const SESSION_ENDED_MESSAGES = [
    'No token provided',
    'Invalid token format',
    'Invalid token',
    'Token expired',
    'Account no longer active',
    'Your account was deactivated',
];

let unauthorizedHandler = null;

// HomeContext registers its logout here, so an expired or revoked session
// sends the user back to the login screen instead of leaving every screen
// failing silently.
export const setUnauthorizedHandler = (handler) => {
    unauthorizedHandler = handler;
};

export const apiCall = async (endpoint, method = 'GET', payload = null, isFormData = false) => {
    try {
        const token = await AsyncStorage.getItem('token');

        let headers = {
            Authorization: `Bearer ${token}`,
        };

        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        let config = {
            method: method.toUpperCase(),
            url: `${API_URL}${endpoint}`,
            headers: headers,
        };

        if (payload) {
            if (isFormData) {
                config.data = payload;
                if (payload instanceof FormData) {
                    config.headers['Content-Type'] = 'multipart/form-data';
                }
            } else {
                config.data = JSON.stringify(payload);
            }
        }
        const response = await axios(config);
        return response.data;
    
    } catch (error) {
        const status = error.response?.status;
        const serverMessage = error.response?.data?.message;
        if (status === 401 && SESSION_ENDED_MESSAGES.includes(serverMessage) && unauthorizedHandler) {
            unauthorizedHandler(serverMessage);
        }
        return {
            error: true,
            message: error.response?.data?.message || error.message || 'An unexpected error occurred',
            status: error.response?.status
        };
    }
};

