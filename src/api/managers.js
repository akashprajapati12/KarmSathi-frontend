import axios from 'axios';
import API_BASE_URL from './config';

const API_URL = `${API_BASE_URL}/api/auth`;

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const getManagers = async () => {
    const response = await axios.get(`${API_URL}/managers`, getAuthHeaders());
    return response.data;
};

export const createManager = async (managerData) => {
    const response = await axios.post(`${API_URL}/managers`, managerData, getAuthHeaders());
    return response.data;
};

export const updateManagerSites = async (managerId, siteIds) => {
    const response = await axios.put(`${API_URL}/managers/${managerId}/sites`, { siteIds }, getAuthHeaders());
    return response.data;
};

export const deleteManager = async (managerId) => {
    const response = await axios.delete(`${API_URL}/managers/${managerId}`, getAuthHeaders());
    return response.data;
};
