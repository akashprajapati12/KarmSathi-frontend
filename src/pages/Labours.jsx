import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { getLabours, createLabour, deleteLabour, updateLabour, getLabourSiteSummary } from '../api/labour';
import { getSites } from '../api/site';
import { getLabourSalaryHistory, deleteSalaryRecord } from '../api/salaries';
import LabourCalendar from '../components/LabourCalendar';
import CustomDropdown from '../components/ui/CustomDropdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Internal component for site-wise work summary
const SiteWorkSummary = ({ labourId, onSiteClick }) => {
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const data = await getLabourSiteSummary(labourId);
                setSummary(data);
            } catch (err) {
                console.error("Failed to fetch site summary", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, [labourId]);

    if (loading) return <div>Loading summary...</div>;
    if (summary.length === 0) return <div className="text-secondary" style={{ fontStyle: 'italic' }}>No work history found across sites.</div>;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {summary.map((item, idx) => {
                return (
                    <div
                        key={idx}
                        className={`glass-panel`}
                        style={{
                            padding: '1rem',
                            borderLeft: '4px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            background: 'rgba(255, 255, 255, 0.03)',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                            e.currentTarget.style.borderLeft = '4px solid var(--accent-primary)';
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3), 0 0 15px rgba(99, 102, 241, 0.2)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.borderLeft = '4px solid rgba(255,255,255,0.1)';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={() => onSiteClick(item.siteId, item.siteName)}
                    >
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', transition: 'color 0.3s' }}>Site</div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.siteName}</div>
                        <div style={{ marginTop: '5px', color: 'var(--accent-primary)', transition: 'color 0.3s' }}>
                            <strong>{item.count}</strong> {item.count === 1 ? 'Day' : 'Days'} Worked
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Hardcoded months array for the dropdown/printing
const MONTHS = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
];

const Labours = () => {
    const [labours, setLabours] = useState([]);
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
    const [calendarModalSite, setCalendarModalSite] = useState({ id: null, name: '' });

    // Views: 'list' | 'details'
    const [currentView, setCurrentView] = useState('list');
    const [selectedLabour, setSelectedLabour] = useState(null);

    // Salary History State
    const [salaryHistory, setSalaryHistory] = useState([]);

    // PDF Generation State
    const invoiceRef = useRef(null);
    const [activeInvoice, setActiveInvoice] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLabourId, setEditingLabourId] = useState(null);
    const [newLabour, setNewLabour] = useState({
        name: '', mobileNumber: '', address: '', sites: [], aadharNumber: '', designation: '', dailyRate: ''
    });
    const [isCreating, setIsCreating] = useState(false);

    const location = useLocation();

    useEffect(() => {
        fetchData();

        // Handle navigation state from Dashboard Quick Actions
        if (location.state?.openAddModal) {
            setIsModalOpen(true);
            setEditingLabourId(null);
            setNewLabour({ name: '', mobileNumber: '', address: '', sites: [], aadharNumber: '', designation: '', dailyRate: '' });
            // Clear the state from history so reload doesn't keep opening it
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [laboursData, sitesData] = await Promise.all([
                getLabours(),
                getSites()
            ]);
            setLabours(laboursData);
            setSites(sitesData);
        } catch (err) {
            console.error(err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Special useEffect to load history when viewing details
    useEffect(() => {
        if (currentView === 'details' && selectedLabour) {
            loadSalaryHistory();
        }
    }, [currentView, selectedLabour]);

    const loadSalaryHistory = async () => {
        try {
            const data = await getLabourSalaryHistory(selectedLabour._id);
            
            const grouped = data.reduce((acc, curr) => {
                const key = `${curr.year}-${curr.month}`;
                if (!acc[key]) {
                    acc[key] = {
                        _id: key,
                        month: curr.month,
                        year: curr.year,
                        presentDays: 0,
                        basicSalary: 0,
                        totalOvertimeHours: 0,
                        overtimePay: 0,
                        advanceTaken: 0,
                        netPayable: 0,
                        originalRecordIds: [],
                        sites: [],
                        labour: curr.labour,
                        owner: curr.owner,
                        status: curr.status
                    };
                }
                acc[key].presentDays += curr.presentDays;
                acc[key].basicSalary += curr.basicSalary;
                acc[key].totalOvertimeHours += curr.totalOvertimeHours;
                acc[key].overtimePay += curr.overtimePay;
                acc[key].advanceTaken += curr.advanceTaken;
                acc[key].netPayable += curr.netPayable;
                acc[key].originalRecordIds.push(curr._id);
                if (curr.site && curr.site.name && !acc[key].sites.includes(curr.site.name)) {
                    acc[key].sites.push(curr.site.name);
                }
                return acc;
            }, {});

            const aggregatedHistory = Object.values(grouped).sort((a, b) => {
                if (b.year !== a.year) return b.year - a.year;
                return b.month - a.month;
            });
            
            setSalaryHistory(aggregatedHistory);
        } catch (err) {
            console.error("Failed to load salary history", err);
        }
    };

    const handleInputChange = (e) => {
        setNewLabour({ ...newLabour, [e.target.name]: e.target.value });
    };

    const handleCreateOrUpdateLabour = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        setError('');

        try {
            if (editingLabourId) {
                const updatedLabour = await updateLabour(editingLabourId, newLabour);
                setLabours(labours.map(l => l._id === editingLabourId ? updatedLabour : l));
                if (currentView === 'details' && selectedLabour?._id === editingLabourId) {
                    setSelectedLabour(updatedLabour);
                }
            } else {
                const createdLabour = await createLabour(newLabour);
                setLabours([createdLabour, ...labours]);
            }
            handleCloseModal();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to save labourer.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingLabourId(null);
        setNewLabour({ name: '', mobileNumber: '', address: '', sites: [], aadharNumber: '', designation: '', dailyRate: '' });
    };

    const openEditModal = (labour) => {
        setEditingLabourId(labour._id);
        setNewLabour({
            name: labour.name,
            mobileNumber: labour.mobileNumber,
            address: labour.address,
            sites: labour.sites?.map(s => s._id || s) || [],
            aadharNumber: labour.aadharNumber,
            designation: labour.designation,
            dailyRate: labour.dailyRate
        });
        setIsModalOpen(true);
    };

    const handleDeleteLabour = async (id) => {
        if (window.confirm("Are you sure you want to completely delete this worker and their attendance history?")) {
            try {
                await deleteLabour(id);
                setLabours(labours.filter(l => l._id !== id));
                setCurrentView('list');
                setSelectedLabour(null);
            } catch (err) {
                alert("Failed to delete worker.");
            }
        }
    };

    const handleDeleteSalaryRecord = async (aggregatedRecord) => {
        if (window.confirm("Are you sure you want to COMPLETELY and PERMANENTLY delete all salary records for this month?")) {
            try {
                for (const id of aggregatedRecord.originalRecordIds) {
                    await deleteSalaryRecord(id, false);
                }
                setSalaryHistory(salaryHistory.filter(r => r._id !== aggregatedRecord._id));
            } catch (err) {
                console.error(err);
                alert("Failed to delete salary record.");
            }
        }
    };

    const openDetails = (labour) => {
        setCalendarModalSite({ id: null, name: '' });
        setIsCalendarModalOpen(false);
        setSelectedLabour(labour);
        setCurrentView('details');
    };

    // --- PDF Generation Logic ---
    const generatePDF = async (salaryRecord) => {
        setActiveInvoice(salaryRecord);

        setTimeout(async () => {
            const element = invoiceRef.current;
            if (!element) return;

            try {
                const canvas = await html2canvas(element, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');

                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Salary_Slip_${salaryRecord.labour.name.replace(' ', '_')}_${salaryRecord.month}_${salaryRecord.year}.pdf`);
            } catch (err) {
                console.error("PDF generation failed:", err);
                alert("Could not generate PDF.");
            } finally {
                setActiveInvoice(null);
            }
        }, 100);
    };

    if (currentView === 'details' && selectedLabour) {
        return (
            <div className="page-container animate-fade-in" style={{ paddingBottom: '4rem', paddingTop: '2rem' }}>
                <button className="btn" style={{ background: 'transparent', color: 'var(--text-secondary)', padding: 0, marginBottom: '1.5rem', width: 'auto' }} onClick={() => { setCurrentView('list'); setIsCalendarModalOpen(false); }}>
                    ← Back to Directory
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2.5rem', margin: 0, color: 'var(--accent-primary)' }}>{selectedLabour.name}</h2>
                        <p className="text-secondary" style={{ fontSize: '1.1rem', marginTop: '0.5rem' }}>
                            {selectedLabour.designation} • {selectedLabour.sites?.map(s => s.name).join(', ') || 'Unassigned'}
                        </p>
                    </div>
                    <div>
                        <button className="btn btn-primary" style={{ width: 'auto', marginRight: '10px' }} onClick={() => openEditModal(selectedLabour)}>
                            ✏️ Edit Details
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                    <div className="glass-panel" style={{ padding: '1.2rem' }}>
                        <span className="text-secondary" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Mobile</span>
                        <div style={{ fontSize: '1.1rem', fontWeight: '500', marginTop: '5px' }}>{selectedLabour.mobileNumber}</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.2rem' }}>
                        <span className="text-secondary" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Daily Rate</span>
                        <div style={{ fontSize: '1.1rem', fontWeight: '500', marginTop: '5px' }}>₹{selectedLabour.dailyRate}</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.2rem' }}>
                        <span className="text-secondary" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Aadhar</span>
                        <div style={{ fontSize: '1.1rem', fontWeight: '500', marginTop: '5px' }}>{selectedLabour.aadharNumber}</div>
                    </div>
                </div>

                {/* Site-wise Summary */}
                <h3 style={{ marginBottom: '1rem' }}>Site-wise Work Summary</h3>
                <p className="text-secondary" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Click on a site card to view the attendance calendar for that specific site.</p>
                <SiteWorkSummary
                    labourId={selectedLabour._id}
                    onSiteClick={(siteId, siteName) => {
                        setCalendarModalSite({ id: siteId, name: siteName });
                        setIsCalendarModalOpen(true);
                    }}
                />

                {/* Integrated Calendar Component - Overall */}
                <h3 style={{ marginTop: '3rem', marginBottom: '1rem' }}>
                    Overall Monthly Attendance
                </h3>
                <LabourCalendar labourId={selectedLabour._id} highlightedSiteId={null} />

                {/* Salary History Section */}
                <h3 style={{ marginTop: '3rem', marginBottom: '1rem' }}>Salary History & Slips</h3>
                {salaryHistory.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
                        No salary records found for this worker yet.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {salaryHistory.map(record => (
                            <div key={record._id} className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.3rem', marginBottom: '8px' }}>
                                        {MONTHS.find(m => m.value === record.month)?.label} {record.year} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--accent-primary)', marginLeft: '10px' }}>{record.sites.join(', ')}</span>
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                            <span>Present: <strong style={{color: 'var(--text-primary)'}}>{record.presentDays} Days</strong></span>
                                            <span>Wages + OT: <strong style={{color: 'var(--text-primary)'}}>₹{(record.basicSalary + record.overtimePay).toFixed(2)}</strong></span>
                                            <span>Advance Deducted: <strong style={{color: '#f87171'}}>- ₹{record.advanceTaken.toFixed(2)}</strong></span>
                                        </div>
                                        <div style={{ marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                                            Net Paid: <span style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '1.2rem' }}>₹{record.netPayable.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', minWidth: '300px' }}>
                                        <button className="btn btn-primary" style={{ padding: '0.4rem 0.5rem', width: '100%', fontSize: '0.85rem' }} onClick={() => generatePDF(record)}>
                                            🖨️ Download PDF
                                        </button>
                                        <button className="btn btn-danger" style={{ padding: '0.4rem 0.5rem', width: '100%', fontSize: '0.85rem' }} onClick={() => handleDeleteSalaryRecord(record)}>
                                            🗑️ Delete Record
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'center' }}>
                    <button className="btn btn-danger" style={{ width: 'auto' }} onClick={() => handleDeleteLabour(selectedLabour._id)}>
                        🗑️ Delete Worker Permanently
                    </button>
                </div>

                {/* Hidden Invoice DOM */}
                {activeInvoice && (
                    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                        <div ref={invoiceRef} style={{
                            width: '800px', // A4 approx width ratio
                            background: 'white',
                            padding: '40px',
                            fontFamily: 'Arial, sans-serif',
                            color: 'black',
                            boxSizing: 'border-box',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>

                            {/* Global Watermark Background Overlay */}
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                zIndex: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: 0.15, pointerEvents: 'none'
                            }}>
                                <img src="/favicon.png" alt="Watermark Logo" style={{ width: '85%', height: 'auto', objectFit: 'contain' }} />
                            </div>

                            {/* Foreground Content */}
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #334155', paddingBottom: '20px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <img src="/favicon.png" alt="Logo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                                        <div>
                                            <h1 style={{ margin: 0, fontSize: '32px', color: '#0f172a' }}>KarmSathi</h1>
                                            <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Construction Labour Management</p>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <h2 style={{ margin: 0, fontSize: '24px', color: '#3b82f6', textTransform: 'uppercase' }}>Salary Slip</h2>
                                        <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '1.1rem' }}>Period: {MONTHS.find(m => m.value === activeInvoice.month).label} {activeInvoice.year}</p>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '40px' }}>
                                    <div style={{ marginBottom: '10px', fontSize: '1.6rem', fontWeight: 'bold', color: '#0f172a' }}>{activeInvoice.labour.name}</div>
                                    <div style={{ marginBottom: '5px', fontSize: '1.1rem' }}><strong>Designation:</strong> {activeInvoice.labour.designation}</div>
                                    <div style={{ marginBottom: '5px', fontSize: '1.1rem' }}><strong>Mobile:</strong> {activeInvoice.labour.mobileNumber}</div>
                                    <div style={{ fontSize: '1.1rem' }}><strong>Site:</strong> {activeInvoice.sites?.join(', ')}</div>
                                </div>

                                <div style={{ position: 'relative', marginBottom: '30px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.1rem', position: 'relative', zIndex: 1, background: 'transparent' }}>
                                        <thead>
                                            <tr style={{ background: '#cbd5e1' }}>
                                                <th style={{ padding: '14px', textAlign: 'left', border: '1px solid #94a3b8' }}>Description</th>
                                                <th style={{ padding: '14px', textAlign: 'right', border: '1px solid #94a3b8', width: '250px' }}>Amount / Details</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style={{ padding: '14px', border: '1px solid #cbd5e1' }}>Basic Salary (Daily Wage)</td>
                                                <td style={{ padding: '14px', border: '1px solid #cbd5e1', textAlign: 'right' }}>₹{activeInvoice.labour.dailyRate.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '14px', border: '1px solid #cbd5e1' }}>Number of Days Present</td>
                                                <td style={{ padding: '14px', border: '1px solid #cbd5e1', textAlign: 'right' }}>{activeInvoice.presentDays} Days</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '14px', border: '1px solid #cbd5e1' }}>Calculated Salary (Present Days × Basic Salary)</td>
                                                <td style={{ padding: '14px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold' }}>₹{activeInvoice.basicSalary.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '14px', border: '1px solid #cbd5e1' }}>Overtime Hours</td>
                                                <td style={{ padding: '14px', border: '1px solid #cbd5e1', textAlign: 'right' }}>{activeInvoice.totalOvertimeHours} hrs</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '14px', border: '1px solid #cbd5e1' }}>Overtime Salary</td>
                                                <td style={{ padding: '14px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold' }}>₹{activeInvoice.overtimePay.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '14px', border: '1px solid #cbd5e1', color: '#ea580c' }}>Advances / Deductions</td>
                                                <td style={{ padding: '14px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#ea580c', fontWeight: 'bold' }}>- ₹{activeInvoice.advanceTaken.toFixed(2)}</td>
                                            </tr>
                                            <tr style={{ background: '#e2e8f0', fontWeight: 'bold', fontSize: '20px' }}>
                                                <td style={{ padding: '18px', border: '1px solid #94a3b8' }}>Net Payable Amount</td>
                                                <td style={{ padding: '18px', border: '1px solid #94a3b8', textAlign: 'right', color: '#16a34a' }}>₹{activeInvoice.netPayable.toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '1.2rem', fontWeight: '500', position: 'relative' }}>
                                    {activeInvoice.status === 'Paid' && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '20px',
                                            right: '30%',
                                            width: '180px',
                                            height: '180px',
                                            transform: 'rotate(-15deg)',
                                            opacity: 0.85,
                                            zIndex: 10,
                                            pointerEvents: 'none'
                                        }}>
                                            <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="100" cy="100" r="90" fill="none" stroke="#10b981" strokeWidth="12" strokeDasharray="10 5" />
                                                <circle cx="100" cy="100" r="75" fill="none" stroke="#10b981" strokeWidth="4" />
                                                <circle cx="100" cy="100" r="68" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="5 5" />
                                                <path id="curveTop2" d="M 40 100 A 60 60 0 0 1 160 100" fill="transparent" />
                                                <text fill="#10b981" fontSize="15" fontWeight="bold" letterSpacing="3">
                                                    <textPath href="#curveTop2" startOffset="50%" textAnchor="middle">• THANK YOU •</textPath>
                                                </text>
                                                <path id="curveBottom2" d="M 35 110 A 65 65 0 0 0 165 110" fill="transparent" />
                                                <text fill="#10b981" fontSize="15" fontWeight="bold" letterSpacing="3">
                                                    <textPath href="#curveBottom2" startOffset="50%" textAnchor="middle">• THANK YOU •</textPath>
                                                </text>
                                                <text x="100" y="118" fill="#10b981" fontSize="56" fontWeight="900" textAnchor="middle" letterSpacing="4">PAID</text>
                                                <line x1="20" y1="80" x2="180" y2="80" stroke="#ffffff" strokeWidth="3" opacity="0.6" strokeDasharray="4 2 8 4" />
                                                <line x1="30" y1="120" x2="170" y2="120" stroke="#ffffff" strokeWidth="4" opacity="0.5" strokeDasharray="10 5 2 8" />
                                                <line x1="50" y1="140" x2="150" y2="140" stroke="#ffffff" strokeWidth="2" opacity="0.7" strokeDasharray="6 4" />
                                            </svg>
                                        </div>
                                    )}
                                    <div style={{ width: '250px', textAlign: 'center' }}>
                                        <div style={{ fontFamily: '"Signatie", cursive', fontSize: '28px', color: '#1e293b', lineHeight: '1', transform: 'rotate(-5deg)', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'visible' }}>
                                            {activeInvoice.owner?.name}
                                        </div>
                                        <div style={{ borderTop: '2px solid #64748b', paddingTop: '15px' }}>
                                            Employer Signature
                                        </div>
                                    </div>
                                    <div style={{ width: '250px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                        <div style={{ fontFamily: '"Signatie", cursive', fontSize: '28px', color: '#1e293b', lineHeight: '1', transform: 'rotate(-5deg)', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'visible' }}>
                                            {activeInvoice.labour?.name}
                                        </div>
                                        <div style={{ borderTop: '2px solid #64748b', paddingTop: '15px' }}>
                                            Worker Signature
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Calendar Popup Modal */}
                {isCalendarModalOpen && createPortal(
                    <div className="modal-overlay fullscreen">
                        <div className="glass-panel animate-fade-in" style={{ background: 'var(--bg-secondary)', padding: '2rem', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Site Attendance Calendar</h2>
                                    <p style={{ color: 'var(--accent-primary)', margin: '0.2rem 0 0 0', fontWeight: 'bold' }}>📍 {calendarModalSite.name}</p>
                                </div>
                                <button onClick={() => setIsCalendarModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '3rem', cursor: 'pointer', lineHeight: '1' }}>&times;</button>
                            </div>

                            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                                <LabourCalendar labourId={selectedLabour._id} highlightedSiteId={calendarModalSite.id} />
                            </div>

                            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                                <button className="btn btn-primary" style={{ width: 'auto', padding: '1rem 3rem' }} onClick={() => setIsCalendarModalOpen(false)}>Close Calendar</button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            </div>
        );
    }

    // LIST VIEW
    return (
        <>
            <div className="page-container animate-fade-in" style={{ paddingBottom: '4rem', position: 'relative' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Labours Directory</h2>
                        <p className="text-secondary">Register and manage all construction workers across active sites.</p>
                    </div>
                    <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setEditingLabourId(null); setIsModalOpen(true); }}>
                        + Add Labour
                    </button>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                {/* Main Labour Grid */}
                {loading ? (
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p className="text-secondary">Loading directory...</p>
                    </div>
                ) : labours.length === 0 ? (
                    <div className="glass-panel" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem' }}>👷</span>
                        <h3 style={{ marginBottom: '0.5rem' }}>No Labours Added</h3>
                        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Start by adding workers to your directory.</p>
                        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setIsModalOpen(true)}>Add First Labour</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            {labours.map(labour => (
                                <div key={labour._id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)' }}>{labour.name}</h3>
                                        <p style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: '500' }}>{labour.designation}</p>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '0.5rem', alignItems: 'center' }}>
                                            <span style={{ opacity: 0.7 }}>📱</span> <span style={{ fontSize: '0.9rem' }}>{labour.mobileNumber}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                                            <span style={{ opacity: 0.7 }}>🏗️</span>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                {labour.sites && labour.sites.length > 0
                                                    ? labour.sites.map(s => s.name).join(', ')
                                                    : 'Unassigned'}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        className="btn btn-primary"
                                        style={{ marginTop: '1.5rem', padding: '0.6rem' }}
                                        onClick={() => openDetails(labour)}
                                    >
                                        View Details & Attendance
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* Global Add/Edit Labour Modal Form */}
            {
                isModalOpen && createPortal(
                    <div className="modal-overlay fullscreen">
                        <div className="glass-panel animate-fade-in" style={{ 
                            background: 'var(--bg-secondary)', 
                            padding: '2.5rem', 
                            maxWidth: '750px',
                            width: '100%',
                            margin: '0 auto'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                <h2 style={{ margin: 0 }}>{editingLabourId ? 'Edit Labour Details' : 'Register New Worker'}</h2>
                                <button onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '2.5rem', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
                            </div>

                                <form onSubmit={handleCreateOrUpdateLabour}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <input type="text" name="name" className="form-input" placeholder="Full Name" value={newLabour.name} onChange={handleInputChange} required />
                                            <label className="form-label">Full Name</label>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <input type="tel" name="mobileNumber" className="form-input" placeholder="Mobile Number" value={newLabour.mobileNumber} onChange={handleInputChange} required />
                                            <label className="form-label">Mobile Number</label>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <input type="text" name="address" className="form-input" placeholder="Residential Address" value={newLabour.address} onChange={handleInputChange} required />
                                        <label className="form-label">Address</label>
                                    </div>

                                    <div style={{ marginBottom: '2rem' }}>
                                        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: '500' }}>Assign to Work Sites:</p>
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '10px',
                                            background: 'rgba(255,255,255,0.03)',
                                            padding: '1.5rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--glass-border)'
                                        }}>
                                            {sites.map(s => (
                                                <label key={s._id} style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '8px', 
                                                    padding: '8px 16px', 
                                                    borderRadius: '25px', 
                                                    cursor: 'pointer',
                                                    border: `1px solid ${newLabour.sites.includes(s._id) ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                                                    background: newLabour.sites.includes(s._id) ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                                    transition: 'all 0.2s'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        style={{ display: 'none' }}
                                                        checked={newLabour.sites.includes(s._id)}
                                                        onChange={(e) => {
                                                            const newSites = e.target.checked
                                                                ? [...newLabour.sites, s._id]
                                                                : newLabour.sites.filter(id => id !== s._id);
                                                            setNewLabour({ ...newLabour, sites: newSites });
                                                        }}
                                                    />
                                                    🏗️ {s.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <input type="text" name="aadharNumber" className="form-input" placeholder="Aadhar Card Number" value={newLabour.aadharNumber} onChange={handleInputChange} required />
                                        <label className="form-label">Aadhar Number</label>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <input type="text" name="designation" className="form-input" placeholder="e.g., Mason, Helper, Painter" value={newLabour.designation} onChange={handleInputChange} required />
                                            <label className="form-label">Designation / Role</label>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <input type="number" name="dailyRate" className="form-input" placeholder="Daily Wage (₹)" value={newLabour.dailyRate} onChange={handleInputChange} onWheel={(e) => e.target.blur()} min="0" step="any" required />
                                            <label className="form-label">Daily Wage Rate (₹)</label>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '3rem' }}>
                                        <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={handleCloseModal} disabled={isCreating}>Cancel</button>
                                        <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={isCreating}>
                                            {isCreating ? 'Saving...' : (editingLabourId ? 'Update Worker' : 'Complete Registration')}
                                        </button>
                                    </div>
                                </form>
                        </div>
                    </div>,
                    document.body
                )
            }
        </>
    );
};

export default Labours;
