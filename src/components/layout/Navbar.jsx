import { useState, useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { updateUserAccount, deleteUserAccount } from '../../api/auth';
import './Navbar.css';

const Navbar = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', username: '', email: '', password: '' });
    const [isUpdating, setIsUpdating] = useState(false);
    const [headerError, setHeaderError] = useState('');
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);

    const { user, logout, updateUserState } = useContext(AuthContext);
    const navigate = useNavigate();
    const sidebarRef = useRef();
    const profileDropdownRef = useRef();

    useEffect(() => {
        if (user) {
            setEditForm({ name: user.name || '', username: user.username, email: user.email, password: '' });
        }
    }, [user, isEditModalOpen]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Optionally, hide the button when the app is successfully installed
        window.addEventListener('appinstalled', () => {
            setIsInstallable(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallApp = async () => {
        if (!deferredPrompt) return;
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstallable(false);
        }
        // We no longer need the prompt. Clear it up.
        setDeferredPrompt(null);
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleUpdateAccount = async (e) => {
        e.preventDefault();
        setHeaderError('');
        setIsUpdating(true);
        try {
            const updatedUserResponse = await updateUserAccount(editForm);
            updateUserState(updatedUserResponse.user);
            setIsEditModalOpen(false);
            setEditForm(prev => ({ ...prev, password: '' }));
            alert("Account updated successfully!");
        } catch (err) {
            setHeaderError(err.response?.data?.message || 'Failed to update account');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm("WARNING: Are you absolutely sure? This will delete your account and ALL associated Sites, Labours, Salaries, and Records irreversibly.")) {
            try {
                await deleteUserAccount();
                logout();
                navigate('/signup');
            } catch (err) {
                alert(err.response?.data?.message || "Failed to delete account");
            }
        }
    };

    // Close sidebar and profile dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setIsSidebarOpen(false);
            }
            if (isProfileDropdownOpen && profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setIsProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.addEventListener('mousedown', handleClickOutside);
        };
    }, [isSidebarOpen, isProfileDropdownOpen]);

    return (
        <>
            <nav className="navbar glass-panel">
                <div className="navbar-left">
                    <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Menu">
                        <span className={`hamburger-line ${isSidebarOpen ? 'open' : ''}`}></span>
                        <span className={`hamburger-line ${isSidebarOpen ? 'open' : ''}`}></span>
                        <span className={`hamburger-line ${isSidebarOpen ? 'open' : ''}`}></span>
                    </button>
                    <Link to="/dashboard" className="navbar-brand" style={{ textDecoration: 'none' }}>
                        <span className="text-accent" style={{ fontWeight: '700', fontSize: '1.4rem' }}>Karm</span>Sathi
                    </Link>
                </div>

                <div className="navbar-right" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '15px' }} ref={profileDropdownRef}>
                    {isInstallable && (
                        <button
                            className="btn btn-primary animate-fade-in"
                            onClick={handleInstallApp}
                            title="Download App"
                            style={{ width: '40px', height: '40px', padding: '0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
                        >
                            📥
                        </button>
                    )}

                    <div
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    >
                        <div className="avatar-circle">
                            {user?.name ? user.name.charAt(0).toUpperCase() : (user?.username ? user.username.charAt(0).toUpperCase() : 'U')}
                        </div>
                    </div>

                    {isProfileDropdownOpen && (
                        <div className="profile-dropdown glass-panel animate-fade-in" style={{
                            position: 'absolute',
                            top: '110%',
                            right: '0',
                            width: '240px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                            padding: '1rem',
                            zIndex: 1000,
                            border: '1px solid var(--glass-border)'
                        }}>
                            <div style={{ paddingBottom: '0.8rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '0.5rem' }}>
                                <p style={{ margin: 0, fontWeight: 'bold' }}>{user?.name || user?.username}</p>
                                <p className="text-secondary" style={{ margin: 0, fontSize: '0.85rem' }}>@{user?.username}</p>
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                <li>
                                    <button
                                        className="btn"
                                        onClick={() => { setIsProfileDropdownOpen(false); setIsEditModalOpen(true); }}
                                        style={{ width: '100%', padding: '0.6rem 1rem', background: 'var(--accent-primary)', color: 'white', marginBottom: '0.5rem', border: 'none', justifyContent: 'flex-start' }}
                                    >
                                        ✏️ Edit Account Info
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className="btn"
                                        onClick={handleDeleteAccount}
                                        style={{ width: '100%', padding: '0.6rem 1rem', background: 'var(--error)', color: 'white', border: 'none', justifyContent: 'flex-start' }}
                                    >
                                        🗑️ Delete Account
                                    </button>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </nav>

            <div className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

            <aside className={`sidebar glass-panel ${isSidebarOpen ? 'open' : ''}`} ref={sidebarRef}>
                <div className="sidebar-header">
                    <h3 className="text-accent">Menu</h3>
                    <button className="close-btn" onClick={toggleSidebar}>&times;</button>
                </div>

                <ul className="sidebar-nav">
                    <li>
                        <Link to="/dashboard" onClick={() => setIsSidebarOpen(false)}>
                            <span className="nav-icon">📊</span>
                            Dashboard Overview
                        </Link>
                    </li>
                    <li>
                        <Link to="/sites" onClick={() => setIsSidebarOpen(false)}>
                            <span className="nav-icon">🏗️</span>
                            Active Sites
                        </Link>
                    </li>
                    <li>
                        <Link to="/labours" onClick={() => setIsSidebarOpen(false)}>
                            <span className="nav-icon">👷</span>
                            Labours
                        </Link>
                    </li>
                    <li>
                        <Link to="/attendance" onClick={() => setIsSidebarOpen(false)}>
                            <span className="nav-icon">📋</span>
                            Attendance
                        </Link>
                    </li>
                    <li>
                        <Link to="/leaves" onClick={() => setIsSidebarOpen(false)}>
                            <span className="nav-icon">🌴</span>
                            Leaves
                        </Link>
                    </li>
                    <li>
                        <Link to="/salaries" onClick={() => setIsSidebarOpen(false)}>
                            <span className="nav-icon">💰</span>
                            Salaries
                        </Link>
                    </li>
                    <li>
                        <Link to="/advances" onClick={() => setIsSidebarOpen(false)}>
                            <span className="nav-icon">🏦</span>
                            Advances
                        </Link>
                    </li>
                </ul>

                <div className="sidebar-footer">
                    <button className="btn btn-danger" onClick={handleLogout}>
                        <span className="nav-icon">🚪</span>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Profile Edit Modal Using Portal */}
            {isEditModalOpen && createPortal(
                <div className="modal-overlay">
                    <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '450px', background: 'var(--bg-secondary)', padding: '2rem', margin: '5vh auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Edit Account Info</h3>
                            <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                        </div>

                        {headerError && <div className="alert alert-error">{headerError}</div>}

                        <form onSubmit={handleUpdateAccount}>
                            <div className="form-group">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Full Name"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    required
                                />
                                <label className="form-label">Full Name</label>
                            </div>

                            <div className="form-group">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Username"
                                    value={editForm.username}
                                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                    required
                                />
                                <label className="form-label">Username</label>
                            </div>

                            <div className="form-group">
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="Email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    required
                                />
                                <label className="form-label">Email</label>
                            </div>

                            <div className="form-group">
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="New Password (optional)"
                                    value={editForm.password}
                                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                />
                                <label className="form-label">New Password (leave blank to keep current)</label>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button type="button" className="btn btn-danger" onClick={() => setIsEditModalOpen(false)} disabled={isUpdating}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isUpdating}>
                                    {isUpdating ? 'Saving...' : 'Update Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default Navbar;
