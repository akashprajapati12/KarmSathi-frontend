let BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
if (BASE.endsWith('/api')) BASE = BASE.slice(0, -4);
if (BASE.endsWith('/api/')) BASE = BASE.slice(0, -5);
if (BASE.endsWith('/')) BASE = BASE.slice(0, -1);
const API_BASE_URL = BASE;
export default API_BASE_URL;
