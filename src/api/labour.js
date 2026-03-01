import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

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
    const response = await authApi.get('/labours');
    return response.data;
};

export const createLabour = async (labourData) => {
    const response = await authApi.post('/labours', labourData);
    return response.data;
};

export const getLabourDetails = async (id) => {
    const response = await authApi.get(`/labours/${id}`);
    return response.data;
};

export const updateLabour = async (id, labourData) => {
    const response = await authApi.put(`/labours/${id}`, labourData);
    return response.data;
};

export const deleteLabour = async (id) => {
    const response = await authApi.delete(`/labours/${id}`);
    return response.data;
};

// --- Attendance Endpoints ---

export const getDailyAttendance = async (dateStr) => {
    const response = await authApi.get(`/attendance/daily/${dateStr}`);
    return response.data;
};

export const getMonthlyAttendance = async (labourId, year, month) => {
    const response = await authApi.get(`/attendance/summary/${labourId}/${year}/${month}`);
    return response.data;
};

export const markAttendance = async (attendanceData) => {
    const response = await authApi.post('/attendance', attendanceData);
    return response.data;
};
