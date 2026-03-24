import { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import { getManagers, createManager, updateManagerSites, deleteManager } from '../api/managers';
import axios from 'axios';
import API_BASE_URL from '../api/config';

const getSites = async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/api/sites?all=true`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

const Managers = () => {
    const { role } = useContext(AuthContext);
    const [managers, setManagers] = useState([]);
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(null); // holds manager object
    const [form, setForm] = useState({ name: '', username: '', email: '', password: '', siteIds: [] });
    const [assignSiteIds, setAssignSiteIds] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [selectedManager, setSelectedManager] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [mgrs, sts] = await Promise.all([getManagers(), getSites()]);
            setManagers(mgrs);
            setSites(sts);
        } catch (err) {
            setError('Failed to load managers.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSubmitting(true);
        try {
            await createManager(form);
            setShowCreateModal(false);
            setForm({ name: '', username: '', email: '', password: '', siteIds: [] });
            fetchData();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create manager');
        } finally {
            setSubmitting(false);
        }
    };

    const openAssignModal = (mgr) => {
        setShowAssignModal(mgr);
        setAssignSiteIds(mgr.assignedSites.map(s => s._id));
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await updateManagerSites(showAssignModal._id, assignSiteIds);
            setShowAssignModal(null);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update sites');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (mgr) => {
        if (!window.confirm(`Delete manager "${mgr.name}"? They will lose all site access.`)) return;
        try {
            await deleteManager(mgr._id);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete manager');
        }
    };

    const toggleSiteInForm = (siteId, isAssign = false) => {
        if (isAssign) {
            setAssignSiteIds(prev =>
                prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId]
            );
        } else {
            setForm(prev => ({
                ...prev,
                siteIds: prev.siteIds.includes(siteId)
                    ? prev.siteIds.filter(id => id !== siteId)
                    : [...prev.siteIds, siteId]
            }));
        }
    };

    if (selectedManager) {
        return (
            <div className="page-container animate-fade-in" style={{ paddingBottom: '4rem', paddingTop: '1rem' }}>
                <button 
                    className="btn" 
                    style={{ background: 'transparent', color: 'var(--text-secondary)', padding: 0, marginBottom: '2rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }} 
                    onClick={() => setSelectedManager(null)}
                >
                    <span style={{ fontSize: '1.2rem' }}>←</span> Back to Managers
                </button>

                <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '2.5rem', marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                            <div className="avatar-circle" style={{ width: '100px', height: '100px', fontSize: '2.5rem' }}>
                                {selectedManager.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '2.5rem', color: 'var(--accent-primary)' }}>{selectedManager.name}</h1>
                                <p className="text-secondary" style={{ fontSize: '1.2rem', margin: '0.5rem 0' }}>@{selectedManager.username}</p>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <span style={{
                                        padding: '4px 16px',
                                        borderRadius: '20px',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        background: 'var(--success, #22c55e)',
                                        color: 'white'
                                    }}>🔧 Manager Account</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ flex: '1 1 200px', textAlign: 'right', minWidth: '250px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Email Address</p>
                                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{selectedManager.email}</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem' }}>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                🏗️ Assigned Sites ({selectedManager.assignedSites.length})
                            </h3>
                            {selectedManager.assignedSites.length === 0 ? (
                                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderStyle: 'dashed' }}>
                                    <p className="text-secondary">No sites assigned to this manager yet.</p>
                                    <button className="btn btn-primary" onClick={() => openAssignModal(selectedManager)}>Assign Sites Now</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {selectedManager.assignedSites.map(site => (
                                        <div key={site._id} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>{site.name}</p>
                                                <p className="text-secondary" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>{site.address}</p>
                                            </div>
                                            <span style={{ fontSize: '1.5rem' }}>🏗️</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ flex: 1 }}>
                            <h3 style={{ marginBottom: '1.5rem' }}>⚙️ Quick Actions</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <button className="btn btn-primary" style={{ padding: '1.2rem', justifyContent: 'flex-start', fontSize: '1rem' }} onClick={() => openAssignModal(selectedManager)}>
                                    🏗️ Modify Site Assignments
                                </button>
                                <button className="btn btn-danger" style={{ padding: '1.2rem', justifyContent: 'flex-start', fontSize: '1rem' }} onClick={() => {
                                    handleDelete(selectedManager);
                                    if (window.confirm(`Are you sure you want to delete ${selectedManager.name}?`)) {
                                        setSelectedManager(null);
                                    }
                                }}>
                                    🗑️ Terminate Manager Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Owners only
    if (role !== 'Owner') {
        return (
            <div className="page-container animate-fade-in">
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p>⛔ You do not have permission to access this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in">
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0 }}>👥 Managers</h2>
                    <p className="text-secondary" style={{ margin: '4px 0 0' }}>
                        Create manager accounts and assign them to sites
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    + Add Manager
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <span className="spinner"></span>
                </div>
            ) : managers.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '3rem' }}>👔</p>
                    <h3>No Managers Yet</h3>
                    <p className="text-secondary">Click "Add Manager" to create a manager account and assign them to a site.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
                    {managers.map(mgr => (
                        <div key={mgr._id} className="glass-panel" style={{ padding: '1.8rem', cursor: 'pointer', transition: 'transform 0.2s, background 0.2s' }} onClick={() => setSelectedManager(mgr)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div className="avatar-circle" style={{ width: '48px', height: '48px', fontSize: '1.2rem' }}>
                                        {mgr.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: '700', fontSize: '1.1rem' }}>{mgr.name}</p>
                                        <p className="text-secondary" style={{ margin: 0, fontSize: '0.9rem' }}>@{mgr.username}</p>
                                    </div>
                                </div>
                                <span style={{
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    background: 'var(--success, #22c55e)',
                                    color: 'white'
                                }}>MANAGER</span>
                            </div>
                            
                            <div style={{ marginBottom: '1.5rem' }}>
                                <p className="text-secondary" style={{ margin: '0 0 10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>✉️</span> {mgr.email}
                                </p>
                                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                                    <p style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Assigned Sites ({mgr.assignedSites.length}):</p>
                                    {mgr.assignedSites.length === 0 ? (
                                        <p className="text-secondary" style={{ fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>No sites assigned</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {mgr.assignedSites.slice(0, 3).map(site => (
                                                <span key={site._id} style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    fontSize: '0.8rem',
                                                    border: '1px solid var(--glass-border)'
                                                }}>
                                                    🏗️ {site.name}
                                                </span>
                                            ))}
                                            {mgr.assignedSites.length > 3 && (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                                                    +{mgr.assignedSites.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }} onClick={(e) => e.stopPropagation()}>
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: 1, padding: '0.8rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    onClick={() => openAssignModal(mgr)}
                                >
                                    🏗️ Assign Sites
                                </button>
                                <button
                                    className="btn btn-danger"
                                    style={{ flex: 1, padding: '0.8rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    onClick={() => handleDelete(mgr)}
                                >
                                    🗑️ Delete Account
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Manager Modal */}
            {showCreateModal && createPortal(
                <div className="modal-overlay fullscreen">
                    <div className="glass-panel animate-fade-in" style={{ 
                        background: 'var(--bg-secondary)', 
                        padding: '2.5rem', 
                        maxWidth: '650px',
                        width: '100%',
                        margin: '0 auto'
                    }}>
                        <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                <h2 style={{ margin: 0 }}>Add New Manager</h2>
                                <button 
                                    onClick={() => { setShowCreateModal(false); setFormError(''); }} 
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '2.5rem', cursor: 'pointer', lineHeight: 1 }}
                                >
                                    &times;
                                </button>
                            </div>

                            {formError && <div className="alert alert-error">{formError}</div>}

                            <form onSubmit={handleCreateSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    {[
                                        { label: 'Full Name', key: 'name', type: 'text' },
                                        { label: 'Username', key: 'username', type: 'text' },
                                        { label: 'Email', key: 'email', type: 'email' },
                                        { label: 'Password', key: 'password', type: 'password' },
                                    ].map(({ label, key, type }) => (
                                        <div className="form-group" key={key} style={{ marginBottom: 0 }}>
                                            <input
                                                type={type}
                                                className="form-input"
                                                placeholder={label}
                                                value={form[key]}
                                                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                                                required
                                            />
                                            <label className="form-label">{label}</label>
                                        </div>
                                    ))}
                                </div>

                                {/* Site assignment during creation */}
                                <div style={{ marginBottom: '2.5rem' }}>
                                    <p style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: '600' }}>Assign to Sites (optional)</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                        {sites.map(site => (
                                            <label key={site._id} style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                padding: '8px 16px', borderRadius: '25px', cursor: 'pointer',
                                                border: `1px solid ${form.siteIds.includes(site._id) ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                                                background: form.siteIds.includes(site._id) ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                                fontSize: '0.95rem', transition: 'all 0.2s'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    style={{ display: 'none' }}
                                                    checked={form.siteIds.includes(site._id)}
                                                    onChange={() => toggleSiteInForm(site._id, false)}
                                                />
                                                🏗️ {site.name}
                                            </label>
                                        ))}
                                        {sites.length === 0 && <p className="text-secondary" style={{ fontSize: '0.95rem', margin: 0 }}>No active sites found</p>}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2rem' }}>
                                    <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={() => { setShowCreateModal(false); setFormError(''); }} disabled={submitting}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitting}>{submitting ? 'Creating...' : 'Create Manager'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Assign Sites Modal */}
            {showAssignModal && createPortal(
                <div className="modal-overlay fullscreen">
                    <div className="glass-panel animate-fade-in" style={{ 
                        background: 'var(--bg-secondary)', 
                        padding: '2.5rem', 
                        maxWidth: '650px',
                        width: '100%',
                        margin: '0 auto'
                    }}>
                        <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                <h2 style={{ margin: 0 }}>Assign Sites — {showAssignModal.name}</h2>
                                <button 
                                    onClick={() => setShowAssignModal(null)} 
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '2.5rem', cursor: 'pointer', lineHeight: 1 }}
                                >
                                    &times;
                                </button>
                            </div>

                            <form onSubmit={handleAssignSubmit}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '2.5rem', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    {sites.map(site => (
                                        <label key={site._id} style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '10px 18px', borderRadius: '25px', cursor: 'pointer',
                                            border: `1px solid ${assignSiteIds.includes(site._id) ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                                            background: assignSiteIds.includes(site._id) ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                            fontSize: '0.95rem', transition: 'all 0.2s'
                                        }}>
                                            <input
                                                type="checkbox"
                                                style={{ display: 'none' }}
                                                checked={assignSiteIds.includes(site._id)}
                                                onChange={() => toggleSiteInForm(site._id, true)}
                                            />
                                            🏗️ {site.name}
                                        </label>
                                    ))}
                                    {sites.length === 0 && <p className="text-secondary" style={{ fontSize: '0.95rem' }}>No sites found</p>}
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem' }}>
                                    <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={() => setShowAssignModal(null)} disabled={submitting}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitting}>{submitting ? 'Saving...' : 'Save Assignments'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Managers;
