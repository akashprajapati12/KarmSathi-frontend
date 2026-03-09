import { useState, useEffect } from 'react';
import { getLabours, getDailyAttendance, markAttendance, resetAttendance } from '../api/labour';
import { getSites } from '../api/site';
import CustomDropdown from '../components/ui/CustomDropdown';
import './Attendance.css';
const Attendance = () => {
    // Use YYYY-MM-DD local format
    const getTodayStr = () => {
        const d = new Date();
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    };

    const [selectedDate, setSelectedDate] = useState(getTodayStr());
    const [labours, setLabours] = useState([]);
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState('');
    const [attendanceRecords, setAttendanceRecords] = useState({});
    const [loading, setLoading] = useState(true);

    // Manage OT Popup Modal
    const [otModal, setOtModal] = useState({
        isOpen: false,
        labourId: null,
        labourName: '',
        extraHours: ''
    });

    useEffect(() => {
        fetchDailyData();
    }, [selectedDate]);

    const fetchDailyData = async () => {
        try {
            setLoading(true);
            // Fetch all workers and today's attendance records (which now includes excluded IDs) in parallel
            const [allLabours, dailyData, sitesData] = await Promise.all([
                getLabours(),
                getDailyAttendance(selectedDate),
                getSites()
            ]);
            setSites(sitesData);

            // Extract data depending on API response format (old format vs new format with excluded workers)
            const records = dailyData.records || dailyData;
            const excludedIds = dailyData.excludedWorkerIds || [];

            // Filter out workers whose IDs are in the excluded list (on leave)
            const availableLabours = allLabours.filter(labour => !excludedIds.includes(labour._id));
            setLabours(availableLabours);

            // Map records by Labour ID for easy lookup in the table
            const recordsMap = {};
            records.forEach(record => {
                recordsMap[record.labour._id || record.labour] = record;
            });
            setAttendanceRecords(recordsMap);

        } catch (err) {
            console.error("Failed to fetch daily data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAttendance = async (labourId, status, extraHours = 0) => {
        if (!selectedSite || selectedSite === 'All Sites') {
            alert("Please select a specific site to mark attendance.");
            return;
        }

        try {
            let calcHours = 0;
            if (status === 'Present') calcHours = 8;
            else if (status === 'Half Day') calcHours = 4;
            else if (status === 'Overtime') calcHours = 8 + parseFloat(extraHours);
            else if (status === 'Absent') calcHours = 0;

            const record = await markAttendance({
                labourId,
                date: selectedDate,
                status: status,
                hours: calcHours,
                siteId: selectedSite
            });

            // Update state immediately for snappy UI
            setAttendanceRecords(prev => ({
                ...prev,
                [labourId]: record
            }));

            // Close OT modal if it was open
            if (status === 'Overtime') {
                setOtModal({ isOpen: false, labourId: null, labourName: '', extraHours: '' });
            }

        } catch (err) {
            console.error("Failed to mark attendance", err);
            alert("Error saving attendance");
        }
    };

    const handleResetAttendance = async (labourId) => {
        try {
            await resetAttendance(labourId, selectedDate);
            
            // Update state immediately for snappy UI
            setAttendanceRecords(prev => {
                const newRecords = { ...prev };
                delete newRecords[labourId];
                return newRecords;
            });
        } catch (err) {
            console.error("Failed to reset attendance", err);
            alert("Error resetting attendance");
        }
    };

    const openOtModal = (labourId, labourName) => {
        setOtModal({ isOpen: true, labourId, labourName, extraHours: '' });
    };

    const submitOtModal = () => {
        const extra = parseFloat(otModal.extraHours);
        if (extra > 0) {
            handleMarkAttendance(otModal.labourId, 'Overtime', extra);
        } else {
            alert("Please enter a valid number of extra hours.");
        }
    };

    return (
        <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>

            {/* Header & Date Selector */}
            <div className="attendance-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Daily Attendance</h2>
                    <p className="text-secondary">Mark and review attendance across all workers for a specific day.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="date-selector glass-panel" style={{ flex: '1 1 200px', overflow: 'visible', position: 'relative', zIndex: 50 }}>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginRight: '10px', display: 'block', marginBottom: '0.5rem' }}>Select Site:</label>
                        <CustomDropdown
                            name="site"
                            value={selectedSite}
                            onChange={(e) => setSelectedSite(e.target.value)}
                            options={[
                                { value: 'All Sites', label: 'All Sites' },
                                ...sites.map(s => ({ value: s._id, label: s.name }))
                            ]}
                            placeholder="Select a site..."
                        />
                    </div>

                    <div className="date-selector glass-panel" style={{ flex: '1 1 200px' }}>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginRight: '10px' }}>Select Date:</label>
                        <input
                            type="date"
                            className="form-input"
                            style={{ width: '100%', padding: '0.6rem 0.5rem', appearance: 'auto', marginTop: '0.5rem' }}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                    <span className="spinner"></span> Loading Directory...
                </div>
            ) : !selectedSite ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h3 className="text-secondary">Please select a site to view and mark attendance.</h3>
                </div>
            ) : labours.filter(l => selectedSite === 'All Sites' ? true : l.sites?.some(s => (s._id || s) === selectedSite)).length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h3 className="text-secondary">No workers found for this site.</h3>
                </div>
            ) : (
                <div className="attendance-table-container glass-panel">
                    <table className="attendance-table">
                        <thead>
                            <tr>
                                <th>Worker Details</th>
                                <th>Status</th>
                                <th>Total Hours</th>
                                <th>Mark Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {labours.filter(l => selectedSite === 'All Sites' ? true : l.sites?.some(s => (s._id || s) === selectedSite)).map(labour => {
                                const record = attendanceRecords[labour._id];
                                const status = record?.status || 'Not Marked';
                                const hours = record?.hours || 0;

                                // Check if attendance is marked at another site
                                const recordSiteId = record?.site?._id || record?.site;
                                const isMarkedAtAnotherSite = recordSiteId && selectedSite !== 'All Sites' && recordSiteId !== selectedSite;
                                const otherSiteName = isMarkedAtAnotherSite ? (sites.find(s => s._id === recordSiteId)?.name || 'Another Site') : '';

                                return (
                                    <tr key={labour._id}>

                                        {/* Column 1: Worker Details */}
                                        <td>
                                            <div style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '1.1rem' }}>{labour.name}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                {labour.designation}
                                                {selectedSite === 'All Sites' && (
                                                    <span> • {labour.sites?.map(s => s.name).join(', ')}</span>
                                                )}
                                                {isMarkedAtAnotherSite && (
                                                    <div style={{ color: '#f87171', fontWeight: 'bold', marginTop: '4px' }}>
                                                        ⚠️ Marked at {otherSiteName}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Column 2: Status */}
                                        <td>
                                            <span className={`status-badge status-${status.replace(' ', '-').toLowerCase()}`}>
                                                {status === 'Present' ? 'P' : status === 'Absent' ? 'A' : status === 'Half Day' ? 'H-D' : status === 'Overtime' ? 'OT' : 'Not Marked'}
                                            </span>
                                        </td>

                                        {/* Column 3: Hours  */}
                                        <td>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                                {status !== 'Not Marked' ? `${hours} hrs` : '-'}
                                            </div>
                                        </td>

                                        {/* Column 4: Mark Actions */}
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    onClick={() => status === 'Present' ? handleResetAttendance(labour._id) : (!isMarkedAtAnotherSite && selectedSite !== 'All Sites' && handleMarkAttendance(labour._id, 'Present'))}
                                                    className={`btn-mark mark-p ${status === 'Present' ? 'active' : ''} ${(isMarkedAtAnotherSite && status !== 'Present') || selectedSite === 'All Sites' ? 'disabled' : ''}`}
                                                    title={status === 'Present' ? "Click to Reset" : isMarkedAtAnotherSite ? `Marked at ${otherSiteName}` : selectedSite === 'All Sites' ? "Select a site first" : "Present (8 hrs)"}
                                                    disabled={(isMarkedAtAnotherSite && status !== 'Present') || selectedSite === 'All Sites'}
                                                >
                                                    P
                                                </button>

                                                <button
                                                    onClick={() => status === 'Absent' ? handleResetAttendance(labour._id) : (!isMarkedAtAnotherSite && selectedSite !== 'All Sites' && handleMarkAttendance(labour._id, 'Absent'))}
                                                    className={`btn-mark mark-a ${status === 'Absent' ? 'active' : ''} ${(isMarkedAtAnotherSite && status !== 'Absent') || selectedSite === 'All Sites' ? 'disabled' : ''}`}
                                                    title={status === 'Absent' ? "Click to Reset" : isMarkedAtAnotherSite ? `Marked at ${otherSiteName}` : selectedSite === 'All Sites' ? "Select a site first" : "Absent (0 hrs)"}
                                                    disabled={(isMarkedAtAnotherSite && status !== 'Absent') || selectedSite === 'All Sites'}
                                                >
                                                    A
                                                </button>

                                                <button
                                                    onClick={() => status === 'Half Day' ? handleResetAttendance(labour._id) : (!isMarkedAtAnotherSite && selectedSite !== 'All Sites' && handleMarkAttendance(labour._id, 'Half Day'))}
                                                    className={`btn-mark mark-hd ${status === 'Half Day' ? 'active' : ''} ${(isMarkedAtAnotherSite && status !== 'Half Day') || selectedSite === 'All Sites' ? 'disabled' : ''}`}
                                                    title={status === 'Half Day' ? "Click to Reset" : isMarkedAtAnotherSite ? `Marked at ${otherSiteName}` : selectedSite === 'All Sites' ? "Select a site first" : "Half Day (4 hrs)"}
                                                    disabled={(isMarkedAtAnotherSite && status !== 'Half Day') || selectedSite === 'All Sites'}
                                                >
                                                    H-D
                                                </button>

                                                <button
                                                    onClick={() => status === 'Overtime' ? handleResetAttendance(labour._id) : (!isMarkedAtAnotherSite && selectedSite !== 'All Sites' && openOtModal(labour._id, labour.name))}
                                                    className={`btn-mark mark-ot ${status === 'Overtime' ? 'active' : ''} ${(isMarkedAtAnotherSite && status !== 'Overtime') || selectedSite === 'All Sites' ? 'disabled' : ''}`}
                                                    title={status === 'Overtime' ? "Click to Reset" : isMarkedAtAnotherSite ? `Marked at ${otherSiteName}` : selectedSite === 'All Sites' ? "Select a site first" : "Overtime (8 + extra hrs)"}
                                                    disabled={(isMarkedAtAnotherSite && status !== 'Overtime') || selectedSite === 'All Sites'}
                                                >
                                                    OT
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Overtime Modal */}
            {otModal.isOpen && (
                <div className="modal-overlay" style={{ zIndex: 3000 }}>
                    <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '400px', background: 'var(--bg-secondary)', padding: '2rem', margin: '5vh auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>{otModal.labourName}</h3>
                            <button onClick={() => setOtModal({ isOpen: false, labourId: null, labourName: '', extraHours: '' })} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                        </div>

                        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Add overtime hours</p>

                        <div className="form-group">
                            <input
                                type="number"
                                className="form-input"
                                placeholder="e.g. 2"
                                min="0.5"
                                step="0.5"
                                value={otModal.extraHours}
                                onChange={(e) => setOtModal({ ...otModal, extraHours: e.target.value })}
                                autoFocus
                            />
                            <label className="form-label">Extra Hours Worked</label>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button className="btn btn-danger" onClick={() => setOtModal({ isOpen: false, labourId: null, labourName: '', extraHours: '' })}>Cancel</button>
                            <button className="btn btn-primary" onClick={submitOtModal}>Save Overtime</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Attendance;
