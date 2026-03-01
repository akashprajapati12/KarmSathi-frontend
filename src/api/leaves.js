import axios from 'axios';

const API_URL = 'http://localhost:5000/api/leaves';

// Helper to get Auth Token
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const getLeaves = async () => {
    const response = await axios.get(API_URL, getAuthHeaders());
    return response.data;
};

export const applyLeave = async (leaveData) => {
    const response = await axios.post(API_URL, leaveData, getAuthHeaders());
    return response.data;
};

export const deleteLeave = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`, getAuthHeaders());
    return response.data;
};

export const updateLeaveStatus = async (id, status) => {
    const response = await axios.put(`${API_URL}/${id}/status`, { status }, getAuthHeaders());
    return response.data;
};
