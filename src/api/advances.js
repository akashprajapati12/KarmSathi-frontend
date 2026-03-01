import axios from 'axios';

import API_BASE_URL from './config';
const API_URL = `${API_BASE_URL}/advances`;

// Helper to get Auth Token
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const getAdvances = async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    const endpoint = query ? `${API_URL}?${query}` : API_URL;
    const response = await axios.get(endpoint, getAuthHeaders());
    return response.data;
};

export const recordAdvance = async (data) => {
    const response = await axios.post(API_URL, data, getAuthHeaders());
    return response.data;
};

export const deleteAdvance = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`, getAuthHeaders());
    return response.data;
};
