import axios from 'axios';

import API_BASE_URL from './config';
const API_URL = `${API_BASE_URL}/api/salaries`;

// Helper to get Auth Token
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const getSalaries = async (filters = {}) => {
    // Convert object to query string safely
    const query = new URLSearchParams(filters).toString();
    const endpoint = query ? `${API_URL}?${query}` : API_URL;
    const response = await axios.get(endpoint, getAuthHeaders());
    return response.data;
};

export const getLabourSalaryHistory = async (labourId) => {
    const response = await axios.get(`${API_URL}/labour/${labourId}`, getAuthHeaders());
    return response.data;
};

export const calculateSalaries = async (siteId, month, year) => {
    const response = await axios.post(`${API_URL}/calculate`, { siteId, month, year }, getAuthHeaders());
    return response.data;
};

export const updateSalaryRecord = async (id, data) => {
    // data can include { advanceTaken, status }
    const response = await axios.put(`${API_URL}/${id}`, data, getAuthHeaders());
    return response.data;
};

export const deleteSalaryRecord = async (id, isGlobal = false) => {
    const response = await axios.delete(`${API_URL}/${id}?global=${isGlobal}`, getAuthHeaders());
    return response.data;
};
