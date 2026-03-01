import axios from 'axios';

const API_URL = 'http://localhost:5000/api/salaries';

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

export const deleteSalaryRecord = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`, getAuthHeaders());
    return response.data;
};
