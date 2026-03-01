import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getUserDashboard } from '../api/auth';

const Dashboard = () => {
    const { logout, token } = useContext(AuthContext);
    const navigate = useNavigate();

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);

    // Still verifying token on dashboard load to ensure session is valid
    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await getUserDashboard();
                setDashboardData(res);
            } catch (err) {
                console.error(err);
                if (err.response?.status === 401) {
                    logout();
                    navigate('/login');
                } else {
                    setError('Failed to connect to server');
                }
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchDashboard();
        }
    }, [token, logout, navigate]);

    if (loading) {
        return (
            <div className="center-layout">
                <div className="text-secondary" style={{ fontSize: '1.2rem' }}>
                    Loading your workspace...
                </div>
            </div>
        );
    }

    return (
        <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>

            {/* Dashboard Header */}
            <div style={{ marginBottom: '2.5rem', marginTop: '1rem' }}>
                <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Overview</h2>
                <p className="text-secondary">Track labor management metrics and daily operations.</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Stats Cards Row */}
            {dashboardData && dashboardData.stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>

                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <span className="text-secondary" style={{ fontWeight: '500' }}>Active Workers</span>
                            <div style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent-primary)', padding: '8px', borderRadius: '8px', lineHeight: 1 }}>👷</div>
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {dashboardData.stats.totalWorkers}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--success)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span className="text-secondary">Total registered workforce</span>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <span className="text-secondary" style={{ fontWeight: '500' }}>Today's Attendance</span>
                            <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', padding: '8px', borderRadius: '8px', lineHeight: 1 }}>📋</div>
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {dashboardData.stats.totalWorkers > 0
                                ? Math.round((dashboardData.stats.attendanceToday.present / dashboardData.stats.totalWorkers) * 100)
                                : 0}
                            <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>%</span>
                        </div>
                        <div className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            {dashboardData.stats.attendanceToday.present} Present / {dashboardData.stats.attendanceToday.absent} Absent
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <span className="text-secondary" style={{ fontWeight: '500' }}>Active Sites</span>
                            <div style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '8px', borderRadius: '8px', lineHeight: 1 }}>🏗️</div>
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {dashboardData.stats.totalSites}
                        </div>
                        <div className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            Total managed properties
                        </div>
                    </div>

                </div>
            )}

            {/* Quick Actions / Main Workspace Area */}
            <h3 style={{ marginBottom: '1.5rem' }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderLeft: '4px solid var(--accent-primary)' }}>
                    <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Mark Attendance</h4>
                    <p className="text-secondary" style={{ marginBottom: '1.5rem', lineHeight: '1.5', flex: 1 }}>
                        Record daily present, absent, or half-day status for workers across all active sites.
                    </p>
                    <button onClick={() => navigate('/attendance')} className="btn btn-primary" style={{ width: 'auto', padding: '0.6rem 1.2rem' }}>Open Tracker ➔</button>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderLeft: '4px solid var(--success)' }}>
                    <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Add New Worker</h4>
                    <p className="text-secondary" style={{ marginBottom: '1.5rem', lineHeight: '1.5', flex: 1 }}>
                        Register new labor profiles including skills, assigned site, and contact details.
                    </p>
                    <button onClick={() => navigate('/labours', { state: { openAddModal: true } })} className="btn" style={{ width: 'auto', padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid var(--glass-border)' }}>Register Worker ➔</button>
                </div>

            </div>

        </div>
    );
};

export default Dashboard;
