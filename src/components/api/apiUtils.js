import axios from 'axios';
import { API_URL } from './secrets';
import { showToast } from '../toast/CustomToast.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const apiCall = async (endpoint, method = 'GET', payload = null) => {
    try {
        const token = await AsyncStorage.getItem('token');
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        //console.log('Making API request to:', `${API_URL}${endpoint}`);

        let response;
        switch (method.toUpperCase()) {
            case 'GET':
                response = await axios.get(`${API_URL}${endpoint}`, { headers });
                break;
            case 'POST':
                response = await axios.post(`${API_URL}${endpoint}`, payload, { headers });
                break;
            case 'PUT':
                response = await axios.put(`${API_URL}${endpoint}`, payload, { headers });
                break;
            case 'DELETE':
                response = await axios.delete(`${API_URL}${endpoint}`, { headers });
                break;
            default:
                throw new Error(`Unsupported HTTP method: ${method}`);
        }

        return response.data;
    } catch (error) {
        console.error(`Error in API call to ${endpoint}:`, error.message);
        console.error('Error response:', error.response?.data);
        showToast('error', 'Error', error.response?.data?.message || error.message || 'An unexpected error occurred');
        throw error;
    }
};
