import axios from 'axios';

import API_BASE_URL from './config';
const API_URL = API_BASE_URL;

const authApi = axios.create({
    baseURL: API_URL
});

authApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const getSites = async () => {
    const response = await authApi.get('/sites');
    return response.data;
};

export const createSite = async (siteData) => {
    const response = await authApi.post('/sites', siteData);
    return response.data;
};

export const getSiteDetails = async (id) => {
    const response = await authApi.get(`/sites/${id}`);
    return response.data;
};

export const updateSite = async (id, siteData) => {
    const response = await authApi.put(`/sites/${id}`, siteData);
    return response.data;
};

export const getSiteWorkers = async (id) => {
    const response = await authApi.get(`/sites/${id}/workers`);
    return response.data;
};

export const markSiteComplete = async (id) => {
    const response = await authApi.put(`/sites/${id}/complete`);
    return response.data;
};

export const deleteSite = async (id) => {
    const response = await authApi.delete(`/sites/${id}`);
    return response.data;
};

export const uploadSitePhoto = async (id, photoFile, description = '') => {
    const formData = new FormData();
    formData.append('photo', photoFile);
    formData.append('description', description);

    // axios handles multipart form boundaries automatically when passing FormData
    const response = await authApi.post(`/sites/${id}/upload`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};
