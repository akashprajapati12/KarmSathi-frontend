import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getLeaves, applyLeave, deleteLeave, updateLeaveStatus } from '../api/leaves';
import { getSites } from '../api/site';
import { getLabours } from '../api/labour';
import CustomDropdown from '../components/ui/CustomDropdown';
import './Leaves.css';
const Leaves = () => {
    const [leaves, setLeaves] = useState([]);
    const [sites, setSites] = useState([]);
    const [allLabours, setAllLabours] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [filteredWorkers, setFilteredWorkers] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form Data
    const [newLeave, setNewLeave] = useState({
        siteId: '',
        labourId: '',
        reason: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [leavesData, sitesData, laboursData] = await Promise.all([
                getLeaves(),
                getSites(),
                getLabours()
            ]);
            setLeaves(leavesData);
            setSites(sitesData);
            setAllLabours(laboursData);
        } catch (err) {
            console.error("Failed to load initial data", err);
        } finally {
            setLoading(false);
        }
    };

    // Handle Form Changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewLeave({ ...newLeave, [name]: value });

        // If site is changed, filter the workers list 
        if (name === 'siteId') {
            const workersAtSite = allLabours.filter(l => l.site?._id === value);
            setFilteredWorkers(workersAtSite);
            setNewLeave(prev => ({ ...prev, labourId: '' })); // Reset selected worker
        }
    };

    const handleApplyLeave = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const appliedLeave = await applyLeave(newLeave);

            // Refetch to get populated data reliably (or manually prepend the populated object)
            await fetchInitialData();

            setIsApplyModalOpen(false);
            setNewLeave({ siteId: '', labourId: '', reason: '', startDate: '', endDate: '' });
        } catch (err) {
            alert('Failed to apply leave.');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await updateLeaveStatus(id, status);
            // Update local state without full refetch for speed
            setLeaves(leaves.map(l => l._id === id ? { ...l, status } : l));

            if (status === 'Approved') {
                alert("Leave Approved. The worker will automatically be marked Absent for these dates.");
            }
        } catch (err) {
            alert(`Failed to mark as ${status}.`);
        }
    };

    const handleDeleteLeave = async (id) => {
        if (window.confirm("Are you sure you want to delete this leave request?")) {
            try {
                await deleteLeave(id);
                setLeaves(leaves.filter(l => l._id !== id));
            } catch (err) {
                alert("Failed to delete request.");
            }
        }
    };

    // Date formatting helper
    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <>
            <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Leave Management</h2>
                        <p className="text-secondary">Track, approve, and manage leave requests for all workers.</p>
                    </div>
                    <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setIsApplyModalOpen(true)}>
                        + Apply Leave
                    </button>
                </div>

                {loading ? (
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                        <span className="spinner"></span> Loading Leaves...
                    </div>
                ) : leaves.length === 0 ? (
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        <span style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem', display: 'block' }}>🏝️</span>
                        <h3>No Leave Requests</h3>
                        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Apply for a leave to see it listed here.</p>
                    </div>
                ) : (
                    <div className="leaves-grid">
                        {leaves.map(leave => (
                            <div key={leave._id} className="glass-panel leave-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)' }}>{leave.labour?.name}</h3>
                                        <p style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', margin: 0 }}>{leave.labour?.designation} • {leave.site?.name}</p>
                                    </div>
                                    <span className={`status-badge status-${leave.status.toLowerCase()}`}>
                                        {leave.status}
                                    </span>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Reason</div>
                                    <div style={{ fontWeight: '500', marginBottom: '1rem' }}>"{leave.reason}"</div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>From</div>
                                            <div style={{ fontWeight: '600' }}>{formatDate(leave.startDate)}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>To</div>
                                            <div style={{ fontWeight: '600' }}>{formatDate(leave.endDate)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: 'auto' }}>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '0.5rem', fontSize: '0.9rem', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', borderColor: 'rgba(34, 197, 94, 0.4)' }}
                                        onClick={() => handleUpdateStatus(leave._id, 'Approved')}
                                        disabled={leave.status === 'Approved'}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        style={{ padding: '0.5rem', fontSize: '0.9rem', background: 'rgba(234, 179, 8, 0.2)', color: '#facc15', borderColor: 'rgba(234, 179, 8, 0.4)' }}
                                        onClick={() => handleUpdateStatus(leave._id, 'Denied')}
                                        disabled={leave.status === 'Denied'}
                                    >
                                        Deny
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                                        onClick={() => handleDeleteLeave(leave._id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Apply Leave Modal via Portal */}
                {isApplyModalOpen && createPortal(
                    <div className="modal-overlay">
                        <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', background: 'var(--bg-secondary)', padding: '2rem', margin: '5vh auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>Apply Leave for Worker</h3>
                                <button onClick={() => setIsApplyModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                            </div>

                            <form onSubmit={handleApplyLeave}>
                                <div className="form-group">
                                    <CustomDropdown
                                        name="siteId"
                                        value={newLeave.siteId}
                                        onChange={handleInputChange}
                                        options={sites.map(s => ({ value: s._id, label: s.name }))}
                                        placeholder="Select the Active Site"
                                        required
                                    />
                                    <label className="form-label" style={{ marginTop: '0.5rem' }}>Site Selection</label>
                                </div>

                                <div className="form-group">
                                    <CustomDropdown
                                        name="labourId"
                                        value={newLeave.labourId}
                                        onChange={handleInputChange}
                                        options={filteredWorkers.map(w => ({ value: w._id, label: `${w.name} (${w.designation})` }))}
                                        placeholder={!newLeave.siteId ? 'Please select a site first' : 'Select Worker from Site'}
                                        disabled={!newLeave.siteId}
                                        required
                                    />
                                    <label className="form-label" style={{ marginTop: '0.5rem' }}>Worker Selection</label>
                                </div>

                                <div className="form-group">
                                    <input type="text" name="reason" className="form-input" placeholder="E.g., Medical Emergency, Going to village" value={newLeave.reason} onChange={handleInputChange} required />
                                    <label className="form-label">Reason for Leave</label>
                                </div>

                                <div className="form-group">
                                    <input type="date" name="startDate" className="form-input" value={newLeave.startDate} onChange={handleInputChange} required />
                                    <label className="form-label">Start Date</label>
                                </div>
                                <div className="form-group">
                                    <input type="date" name="endDate" className="form-input" value={newLeave.endDate} onChange={handleInputChange} required />
                                    <label className="form-label">End Date</label>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button type="button" className="btn btn-danger" onClick={() => setIsApplyModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                        {isSubmitting ? 'Submitting...' : 'Apply Leave'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </>
    );
};

export default Leaves;
