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

// --- Labour Endpoints ---

export const getLabours = async () => {
    const response = await authApi.get('/api/labours');
    return response.data;
};

export const createLabour = async (labourData) => {
    const response = await authApi.post('/api/labours', labourData);
    return response.data;
};

export const getLabourDetails = async (id) => {
    const response = await authApi.get(`/api/labours/${id}`);
    return response.data;
};

export const updateLabour = async (id, labourData) => {
    const response = await authApi.put(`/api/labours/${id}`, labourData);
    return response.data;
};

export const deleteLabour = async (id) => {
    const response = await authApi.delete(`/api/labours/${id}`);
    return response.data;
};

export const getLabourSiteSummary = async (id) => {
    const response = await authApi.get(`/api/labours/${id}/site-summary`);
    return response.data;
};

// --- Attendance Endpoints ---

export const getDailyAttendance = async (dateStr) => {
    const response = await authApi.get(`/api/attendance/daily/${dateStr}`);
    return response.data;
};

export const getMonthlyAttendance = async (labourId, year, month) => {
    const response = await authApi.get(`/api/attendance/summary/${labourId}/${year}/${month}`);
    return response.data;
};

export const markAttendance = async (attendanceData) => {
    const response = await authApi.post('/api/attendance', attendanceData);
    return response.data;
};
