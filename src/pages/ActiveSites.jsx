import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getSites, createSite, getSiteWorkers, deleteSite, markSiteComplete, uploadSitePhoto, updateSite } from '../api/site';

const ActiveSites = () => {
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newSiteName, setNewSiteName] = useState('');
    const [newSiteAddress, setNewSiteAddress] = useState('');
    const [newSiteStartDate, setNewSiteStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [isCreating, setIsCreating] = useState(false);

    // Details Modal State
    const [selectedSite, setSelectedSite] = useState(null);
    const [siteWorkers, setSiteWorkers] = useState([]);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    // Photo Upload State
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadDescription, setUploadDescription] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Editing State
    const [isEditingStart, setIsEditingStart] = useState(false);
    const [editStartDate, setEditStartDate] = useState('');

    useEffect(() => {
        fetchSites();
    }, []);

    const fetchSites = async () => {
        try {
            setLoading(true);
            const data = await getSites(true);
            setSites(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load active sites. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSite = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        setError('');

        try {
            const newSite = await createSite({
                name: newSiteName,
                address: newSiteAddress,
                startDate: newSiteStartDate
            });
            setSites([newSite, ...sites]); // Add to top of list
            setIsModalOpen(false);
            setNewSiteName('');
            setNewSiteAddress('');
            setNewSiteStartDate(new Date().toISOString().split('T')[0]);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to create site.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleOpenDetails = async (site) => {
        setSelectedSite(site);
        setIsDetailsLoading(true);
        try {
            const workersData = await getSiteWorkers(site._id);
            setSiteWorkers(workersData);
        } catch (err) {
            console.error(err);
            setError('Failed to load site active workers.');
        } finally {
            setIsDetailsLoading(false);
        }
    };

    const handleDeleteSite = async (siteId) => {
        if (!window.confirm("Are you sure you want to delete this site? Note: This assumes you have re-assigned or cleared any workers assigned here first!")) return;
        try {
            await deleteSite(siteId);
            setSites(sites.filter(s => s._id !== siteId));
            if (selectedSite?._id === siteId) setSelectedSite(null);
        } catch (err) {
            console.error(err);
            setError('Failed to delete site. Please try again.');
        }
    }

    const handleCompleteSite = async (siteId) => {
        if (!window.confirm("Mark this construction site as fully completed?")) return;
        try {
            const updated = await markSiteComplete(siteId);
            setSites(sites.map(s => s._id === siteId ? updated : s));
            if (selectedSite?._id === siteId) setSelectedSite(updated);
        } catch (err) {
            console.error(err);
            setError('Failed to mark site as complete.');
        }
    }

    const handlePhotoUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile || !selectedSite) return;
        setIsUploading(true);
        try {
            const updated = await uploadSitePhoto(selectedSite._id, uploadFile, uploadDescription);

            // Update active list and modal view with new photo data
            setSites(sites.map(s => s._id === selectedSite._id ? updated : s));
            setSelectedSite(updated);

            setUploadFile(null);
            setUploadDescription('');
        } catch (err) {
            console.error(err);
            setError('Failed to upload photo. Ensure it is an image less than 5MB.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveStartDate = async () => {
        try {
            const updated = await updateSite(selectedSite._id, { startDate: editStartDate });
            setSites(sites.map(s => s._id === selectedSite._id ? updated : s));
            setSelectedSite(updated);
            setIsEditingStart(false);
        } catch (err) {
            console.error(err);
            setError('Failed to update start date.');
        }
    };

    return (
        <div className="container animate-fade-in" style={{ paddingBottom: '4rem', position: 'relative' }}>

            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Active Sites</h2>
                    <p className="text-secondary">Manage and monitor all ongoing construction and work sites.</p>
                </div>
                <button
                    className="btn btn-primary"
                    style={{ width: 'auto' }}
                    onClick={() => setIsModalOpen(true)}
                >
                    + Add New Site
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Main Content Area */}
            {loading ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p className="text-secondary">Loading your sites...</p>
                </div>
            ) : sites.length === 0 ? (
                <div className="glass-panel" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem', opacity: 0.5 }}>🏗️</span>
                    <h3 style={{ marginBottom: '0.5rem' }}>No Sites Found</h3>
                    <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
                        You haven't added any construction or work sites yet.
                    </p>
                    <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setIsModalOpen(true)}>
                        Add Your First Site
                    </button>
                </div>
            ) : (
                <>
                    {/* Active Sites Grid */}
                    {sites.filter(site => site.status !== 'Completed').length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                            {sites.filter(site => site.status !== 'Completed').map(site => (
                                <div key={site._id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', cursor: 'pointer' }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--accent-primary)' }}>{site.name}</h3>
                                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            {site.assignedWorkers?.length || 0} Workers
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, marginBottom: '1rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>📍</span>
                                        <p className="text-secondary" style={{ fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
                                            {site.address}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                        <div><strong>Started:</strong> {new Date(site.startDate || site.createdAt).toLocaleDateString()}</div>
                                        <div style={{ color: '#d97706', fontWeight: 'bold' }}>⚡ Active</div>
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        <span className="text-accent" style={{ fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer' }} onClick={() => handleOpenDetails(site)}>Manage ➔</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem', marginBottom: '3rem' }}>
                            <p className="text-secondary">No active sites found.</p>
                        </div>
                    )}

                    {/* Completed Sites Section */}
                    {sites.filter(site => site.status === 'Completed').length > 0 && (
                        <>
                            <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>Completed Sites</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                {sites.filter(site => site.status === 'Completed').map(site => (
                                    <div key={site._id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', cursor: 'pointer', opacity: 0.8 }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-secondary)' }}>{site.name}</h3>
                                            <div style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                Archived
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, marginBottom: '1rem' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>📍</span>
                                            <p className="text-secondary" style={{ fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
                                                {site.address}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                            <div><strong>Started:</strong> {new Date(site.startDate || site.createdAt).toLocaleDateString()}</div>
                                            <div style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Completed {site.endDate && new Date(site.endDate).toLocaleDateString()}</div>
                                        </div>
                                        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                            <span className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer' }} onClick={() => handleOpenDetails(site)}>View Details ➔</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                </>
            )}

            {/* Add Site Modal */}
            {/* Add Site Modal */}
            {isModalOpen && createPortal(
                <div className="modal-overlay">
                    <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-secondary)', padding: '2rem', margin: '5vh auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Add New Site</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleCreateSite}>
                            <div className="form-group">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Site Name (e.g., Downtown Plaza Phase 1)"
                                    value={newSiteName}
                                    onChange={(e) => setNewSiteName(e.target.value)}
                                    required
                                />
                                <label className="form-label">Site Name</label>
                            </div>

                            <div className="form-group">
                                <textarea
                                    className="form-input"
                                    placeholder="Full Site Address"
                                    rows="3"
                                    value={newSiteAddress}
                                    onChange={(e) => setNewSiteAddress(e.target.value)}
                                    required
                                    style={{ resize: 'vertical' }}
                                />
                                <label className="form-label">Address</label>
                            </div>

                            <div className="form-group">
                                <input
                                    type="date"
                                    className="form-input"
                                    value={newSiteStartDate}
                                    onChange={(e) => setNewSiteStartDate(e.target.value)}
                                    required
                                />
                                <label className="form-label">Project Start Date</label>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isCreating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isCreating}
                                >
                                    {isCreating ? 'Creating...' : 'Create Site'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Site Details & Photos Modal */}
            {selectedSite && createPortal(
                <div className="modal-overlay" style={{ zIndex: 10000 }}>
                    <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '900px', height: '90vh', overflowY: 'auto', background: 'var(--bg-secondary)', padding: '2rem', margin: '5vh auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                            <div>
                                <h2 style={{ margin: 0, color: 'var(--accent-primary)' }}>{selectedSite.name}</h2>
                                <p className="text-secondary" style={{ margin: '0.2rem 0 0.5rem 0' }}>{selectedSite.address}</p>

                                {!isEditingStart ? (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        <strong>Project Started:</strong> {new Date(selectedSite.startDate || selectedSite.createdAt).toLocaleDateString()}
                                        <button onClick={() => {
                                            setIsEditingStart(true);
                                            setEditStartDate(selectedSite.startDate ? new Date(selectedSite.startDate).toISOString().split('T')[0] : new Date(selectedSite.createdAt).toISOString().split('T')[0]);
                                        }} style={{ marginLeft: '10px', background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>Edit Date</button>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <strong>Project Started:</strong>
                                        <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                                        <button className="btn btn-primary" onClick={handleSaveStartDate} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Save</button>
                                        <button className="btn" onClick={() => setIsEditingStart(false)} style={{ padding: '4px 12px', fontSize: '0.8rem', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>Cancel</button>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => { setSelectedSite(null); setIsEditingStart(false); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '2rem', cursor: 'pointer', alignSelf: 'flex-start' }}>&times;</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

                            {/* Workers List Section */}
                            <div>
                                <h3>Assigned Workers</h3>
                                {isDetailsLoading ? (
                                    <p className="text-secondary">Loading workers...</p>
                                ) : siteWorkers.length === 0 ? (
                                    <p className="text-secondary">No workers currently assigned to this site.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                                        {siteWorkers.map(worker => (
                                            <div key={worker._id} style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontWeight: 'bold' }}>{worker.name}</span>
                                                    <span style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>₹{worker.dailyRate}/day</span>
                                                </div>
                                                <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
                                                    Role: {worker.designation} <br />
                                                    Contact: {worker.mobileNumber}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Photos Section */}
                            <div>
                                <h3>Site Photos</h3>
                                <form onSubmit={handlePhotoUpload} style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '1.5rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>Upload New Photo</h4>

                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setUploadFile(e.target.files[0])}
                                        style={{ marginBottom: '1rem', width: '100%' }}
                                    />

                                    <input
                                        type="text"
                                        placeholder="Brief description (e.g. Foundation poured)"
                                        className="form-input"
                                        value={uploadDescription}
                                        onChange={(e) => setUploadDescription(e.target.value)}
                                        style={{ marginBottom: '1rem' }}
                                    />

                                    <button type="submit" className="btn btn-primary" disabled={isUploading || !uploadFile} style={{ width: '100%', padding: '0.5rem' }}>
                                        {isUploading ? 'Uploading...' : 'Upload Photo'}
                                    </button>
                                </form>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                                    {selectedSite.photos?.length === 0 ? (
                                        <p className="text-secondary" style={{ gridColumn: 'span 2' }}>No photos uploaded yet.</p>
                                    ) : (
                                        selectedSite.photos?.map((photo, index) => (
                                            <div key={index} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                                <img src={`http://localhost:5000${photo.url}`} alt={photo.description} style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} />
                                                {photo.description && (
                                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', padding: '0.4rem', fontSize: '0.75rem', color: 'white' }}>
                                                        {photo.description}
                                                    </div>
                                                )}
                                                <div style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.5)', padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: 'white', borderBottomLeftRadius: '4px' }}>
                                                    {new Date(photo.uploadedAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                            <button className="btn" style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', width: '100%' }} onClick={() => setSelectedSite(null)}>
                                Close Dashboard
                            </button>

                            {selectedSite.status !== 'Completed' && (
                                <button className="btn btn-primary" style={{ background: '#16a34a', borderColor: '#16a34a', width: '100%' }} onClick={() => handleCompleteSite(selectedSite._id)}>
                                    Mark Site Completed
                                </button>
                            )}

                            <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => handleDeleteSite(selectedSite._id)}>
                                Delete Site Permanently
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
};

export default ActiveSites;
