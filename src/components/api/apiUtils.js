import axios from 'axios';
import { API_URL } from './secrets';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

        /* console.log('API request:', JSON.stringify(config, null, 2)); */
        const response = await axios(config);

        return response.data;
    } catch (error) {
        console.error(`Error in API call to ${endpoint}:`, error.message);
        console.error('Error response:', error.response?.data);

        throw {
            message: error.response?.data?.message || error.message || 'An unexpected error occurred',
            status: error.response?.status
        };
    }
};