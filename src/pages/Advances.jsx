import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getAdvances, recordAdvance, deleteAdvance } from '../api/advances';
import { getSites } from '../api/site';
import { getLabours } from '../api/labour';
import CustomDropdown from '../components/ui/CustomDropdown';
import './Advances.css';
const Advances = () => {
    const [advances, setAdvances] = useState([]);
    const [sites, setSites] = useState([]);
    const [allLabours, setAllLabours] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter state
    const [filterStatus, setFilterStatus] = useState('');

    // Modal State
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [filteredWorkers, setFilteredWorkers] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form Data
    const [newAdvance, setNewAdvance] = useState({
        siteId: '',
        labourId: '',
        amount: '',
        reason: '',
        dateGiven: new Date().toISOString().split('T')[0] // Default to today
    });

    useEffect(() => {
        fetchInitialData();
    }, [filterStatus]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            // Build query params
            const filters = {};
            if (filterStatus) filters.status = filterStatus;

            const [advancesData, sitesData, laboursData] = await Promise.all([
                getAdvances(filters),
                getSites(),
                getLabours()
            ]);
            setAdvances(advancesData);
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
        setNewAdvance({ ...newAdvance, [name]: value });

        // If site is changed, filter the workers list 
        if (name === 'siteId') {
            const workersAtSite = allLabours.filter(l => l.site?._id === value);
            setFilteredWorkers(workersAtSite);
            setNewAdvance(prev => ({ ...prev, labourId: '' })); // Reset selected worker
        }
    };

    const handleRecordAdvance = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await recordAdvance(newAdvance);

            // Refetch to get populated data reliably
            await fetchInitialData();

            setIsApplyModalOpen(false);
            setNewAdvance({
                siteId: '',
                labourId: '',
                amount: '',
                reason: '',
                dateGiven: new Date().toISOString().split('T')[0]
            });
        } catch (err) {
            alert('Failed to record advance.');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAdvance = async (id, status) => {
        if (status === 'Deducted') {
            if (!window.confirm("WARNING: This advance has already been deducted from a salary payout. Are you sure you want to delete it anyway?")) {
                return;
            }
        } else {
            if (!window.confirm("Are you sure you want to delete this advance record?")) {
                return;
            }
        }

        try {
            await deleteAdvance(id);
            setAdvances(advances.filter(a => a._id !== id));
        } catch (err) {
            alert("Failed to delete record.");
        }
    };

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <>
            <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Financial Advances</h2>
                        <p className="text-secondary">Track loans and advances. They will be auto-deducted during salary calculation.</p>
                    </div>
                    <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setIsApplyModalOpen(true)}>
                        + Give Advance
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', overflow: 'visible', position: 'relative', zIndex: 50 }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Filter Status:</label>
                    <div style={{ width: '250px' }}>
                        <CustomDropdown
                            name="filterStatus"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            options={[
                                { value: '', label: 'All Advances' },
                                { value: 'Pending', label: 'Pending (Not Deducted)' },
                                { value: 'Deducted', label: 'Already Deducted' }
                            ]}
                            placeholder="Filter by Status"
                        />
                    </div>
                </div>
                {loading ? (
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                        <span className="spinner"></span> Loading Advances...
                    </div>
                ) : advances.length === 0 ? (
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        <span style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem', display: 'block' }}>🏦</span>
                        <h3>No Advances Found</h3>
                        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>No financial advances matching the current filters.</p>
                    </div>
                ) : (
                    <div className="advances-grid">
                        {advances.map(advance => (
                            <div key={advance._id} className="glass-panel advance-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)' }}>{advance.labour?.name}</h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 ' }}>{advance.site?.name}</p>
                                    </div>
                                    <span className={`status-badge status-${advance.status.toLowerCase()}`}>
                                        {advance.status}
                                    </span>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-end' }}>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Amount Given</div>
                                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f87171' }}>₹{advance.amount.toFixed(2)}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Date</div>
                                            <div style={{ fontWeight: '600' }}>{formatDate(advance.dateGiven)}</div>
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Reason (Optional)</div>
                                    <div style={{ fontWeight: '500', fontStyle: 'italic' }}>"{advance.reason || 'None provided'}"</div>
                                </div>

                                <div style={{ marginTop: 'auto' }}>
                                    <button
                                        className="btn btn-danger"
                                        style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
                                        onClick={() => handleDeleteAdvance(advance._id, advance.status)}
                                    >
                                        🗑️ Delete Advance Record
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Record Advance Modal */}
                {isApplyModalOpen && createPortal(
                    <div className="modal-overlay">
                        <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', background: 'var(--bg-secondary)', padding: '2rem', margin: '5vh auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>Record Worker Advance</h3>
                                <button onClick={() => setIsApplyModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                            </div>

                            <form onSubmit={handleRecordAdvance}>
                                <div className="form-group">
                                    <CustomDropdown
                                        name="siteId"
                                        value={newAdvance.siteId}
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
                                        value={newAdvance.labourId}
                                        onChange={handleInputChange}
                                        options={filteredWorkers.map(w => ({ value: w._id, label: `${w.name} (${w.designation})` }))}
                                        placeholder={!newAdvance.siteId ? 'Please select a site first' : 'Select Worker from Site'}
                                        disabled={!newAdvance.siteId}
                                        required
                                    />
                                    <label className="form-label" style={{ marginTop: '0.5rem' }}>Worker Selection</label>
                                </div>

                                <div className="form-group">
                                    <input type="number" name="amount" min="1" step="0.01" className="form-input" placeholder="E.g., 500" value={newAdvance.amount} onChange={handleInputChange} required />
                                    <label className="form-label">Amount (₹)</label>
                                </div>
                                <div className="form-group">
                                    <input type="date" name="dateGiven" className="form-input" value={newAdvance.dateGiven} onChange={handleInputChange} required />
                                    <label className="form-label">Date Given</label>
                                </div>

                                <div className="form-group">
                                    <input type="text" name="reason" className="form-input" placeholder="Optional brief reason" value={newAdvance.reason} onChange={handleInputChange} />
                                    <label className="form-label">Reason (Optional)</label>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button type="button" className="btn btn-danger" onClick={() => setIsApplyModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                        {isSubmitting ? 'Recording...' : 'Record Advance'}
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

export default Advances;
