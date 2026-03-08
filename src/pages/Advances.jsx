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
    const [selectedWorkerAdvances, setSelectedWorkerAdvances] = useState(null);
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
            const workersAtSite = allLabours.filter(l =>
                l.sites && l.sites.some(s => (s._id || s) === value)
            );
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
                        {Object.values(advances.reduce((acc, curr) => {
                            const key = curr.labour?._id;
                            if (!acc[key]) {
                                acc[key] = {
                                    labour: curr.labour,
                                    totalAmount: 0,
                                    records: []
                                };
                            }
                            acc[key].totalAmount += curr.amount;
                            acc[key].records.push(curr);
                            return acc;
                        }, {})).map((group, index) => (
                            <div key={index} className="glass-panel advance-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--text-primary)' }}>{group.labour?.name}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>{group.labour?.designation || 'Worker'}</p>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Advance Taken</div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f87171' }}>₹{group.totalAmount.toFixed(2)}</div>
                                </div>

                                <button
                                    className="btn btn-primary"
                                    style={{ marginTop: 'auto', width: '100%' }}
                                    onClick={() => setSelectedWorkerAdvances(group)}
                                >
                                    View Advance Slip ➔
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Worker Advance Slip Modal */}
                {selectedWorkerAdvances && selectedWorkerAdvances.records.length > 0 && createPortal(
                    <div className="modal-overlay">
                        <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', background: 'var(--bg-secondary)', padding: '2rem', margin: '5vh auto', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.8rem' }}>{selectedWorkerAdvances.labour?.name}'s Advance Slip</h3>
                                <button onClick={() => setSelectedWorkerAdvances(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                                {selectedWorkerAdvances.records.map(record => (
                                    <div key={record._id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Site: {record.site?.name}</div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Date: {formatDate(record.dateGiven)}</div>
                                            {record.reason && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '5px' }}>"{record.reason}"</div>}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f87171', marginBottom: '10px' }}>₹{record.amount.toFixed(2)}</div>
                                            <span className={`status-badge status-${record.status.toLowerCase()}`}>{record.status}</span>
                                            <br />
                                            <button
                                                className="btn btn-danger"
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginTop: '10px', display: 'inline-block' }}
                                                onClick={async () => {
                                                    await handleDeleteAdvance(record._id, record.status);
                                                    // Immediately remove from the modal view
                                                    setSelectedWorkerAdvances(prev => {
                                                        const newRecords = prev.records.filter(r => r._id !== record._id);
                                                        return {
                                                            ...prev,
                                                            records: newRecords,
                                                            totalAmount: prev.totalAmount - record.amount
                                                        };
                                                    });
                                                }}
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: '500' }}>Overall Total Advance:</span>
                                <span style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#f87171' }}>₹{selectedWorkerAdvances.totalAmount.toFixed(2)}</span>
                            </div>

                            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => setSelectedWorkerAdvances(null)}>
                                Close Slip
                            </button>
                        </div>
                    </div>,
                    document.body
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
                                    <input type="number" name="amount" min="0" step="any" className="form-input" placeholder="E.g., 500" value={newAdvance.amount} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required />
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
