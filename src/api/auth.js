import axios from 'axios';

import API_BASE_URL from './config';
const API_URL = API_BASE_URL;

const authApi = axios.create({
    baseURL: API_URL
});

// Add a request interceptor to add the token to requests
authApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token} `;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const registerUser = async (userData) => {
    const response = await authApi.post('/api/auth/register', userData);
    return response.data;
};

export const loginUser = async (userData) => {
    const response = await authApi.post('/api/auth/login', userData);
    return response.data;
};

export const getUserDashboard = async () => {
    const response = await authApi.get('/api/user/dashboard');
    return response.data;
};

export const updateUserAccount = async (userData) => {
    const response = await authApi.put('/api/user/account', userData);
    return response.data;
};

export const deleteUserAccount = async () => {
    const response = await authApi.delete('/api/user/account');
    return response.data;
};
