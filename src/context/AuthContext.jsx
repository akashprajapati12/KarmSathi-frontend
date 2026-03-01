import { createContext, useState, useEffect } from 'react';
import { loginUser as apiLogin, registerUser as apiRegister } from '../api/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);

    // Parse user info from token or fetch on load
    useEffect(() => {
        if (token) {
            // For a more robust app, we should verify the token with the backend here.
            // But we'll decode it or use stored user data for simplicity in this demo,
            // and let the dashboard request validate the exact user object.
            try {
                const storedUser = localStorage.getItem('user');
                if (storedUser) setUser(JSON.parse(storedUser));
            } catch (err) {
                console.error('Failed to parse stored user');
            }
        }
        setLoading(false);
    }, [token]);

    const login = async (email, password) => {
        const data = await apiLogin({ email, password });
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    };

    const register = async (name, username, email, password) => {
        const data = await apiRegister({ name, username, email, password });
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    };

    const updateUserState = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, register, login, logout, loading, updateUserState }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
