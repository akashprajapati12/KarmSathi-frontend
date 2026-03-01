import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getSalaries, calculateSalaries, updateSalaryRecord, deleteSalaryRecord } from '../api/salaries';
import { getSites } from '../api/site';
import CustomDropdown from '../components/ui/CustomDropdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Hardcoded months array for the dropdown
const MONTHS = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

const Salaries = () => {
    const [salaries, setSalaries] = useState([]);
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [filterSite, setFilterSite] = useState('');
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(currentYear);

    // Modal states
    const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);

    // Calculator Form
    const [calcForm, setCalcForm] = useState({
        siteId: '',
        month: new Date().getMonth() + 1,
        year: currentYear
    });

    // Hidden div ref for PDF Generation
    const invoiceRef = useRef(null);
    const [activeInvoice, setActiveInvoice] = useState(null); // stores salary record currently being printed

    useEffect(() => {
        fetchInitialData();
    }, [filterSite, filterMonth, filterYear]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            // Fetch Sites only once (or if they aren't loaded)
            if (sites.length === 0) {
                const sitesData = await getSites();
                setSites(sitesData);
                // Auto-select first site for filters
                if (sitesData.length > 0 && !filterSite) {
                    setFilterSite(sitesData[0]._id);
                }
            }

            // Fetch Salaries based on filters
            const filters = {};
            if (filterSite) filters.siteId = filterSite;
            if (filterMonth) filters.month = filterMonth;
            if (filterYear) filters.year = filterYear;

            const salariesData = await getSalaries(filters);
            setSalaries(salariesData);

        } catch (err) {
            console.error("Failed to load salaries data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCalculate = async (e) => {
        e.preventDefault();
        try {
            setIsCalculating(true);
            await calculateSalaries(calcForm.siteId, calcForm.month, calcForm.year);

            // Auto switch filters to show the newly calculated data
            setFilterSite(calcForm.siteId);
            setFilterMonth(calcForm.month);
            setFilterYear(calcForm.year);

            setIsCalcModalOpen(false);

            // Refresh grid
            await fetchInitialData();
            alert("Salaries generated successfully based on recorded attendance.");

        } catch (err) {
            alert(err.response?.data?.message || 'Failed to calculate salaries.');
            console.error(err);
        } finally {
            setIsCalculating(false);
        }
    };

    const handleMarkPaid = async (id) => {
        try {
            const updated = await updateSalaryRecord(id, { status: 'Paid' });
            setSalaries(salaries.map(s => s._id === id ? updated : s));
        } catch (err) {
            alert('Failed to update status.');
        }
    };

    const handleAdvanceUpdate = async (id, currentAdvance) => {
        const input = prompt("Enter total Advance taken by this worker this month:", currentAdvance || 0);
        if (input !== null && !isNaN(input)) {
            try {
                const parsed = parseFloat(input);
                const updated = await updateSalaryRecord(id, { advanceTaken: parsed });
                setSalaries(salaries.map(s => s._id === id ? updated : s));
            } catch (err) {
                alert('Failed to update advance amount.');
            }
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this salary record? (Attendance will remain intact)")) {
            try {
                await deleteSalaryRecord(id);
                setSalaries(salaries.filter(s => s._id !== id));
            } catch (err) {
                alert("Failed to delete record.");
            }
        }
    };

    // --- PDF Generation Logic ---
    const generatePDF = async (salaryRecord) => {
        // Step 1: Set the active invoice data so it renders in the hidden div
        setActiveInvoice(salaryRecord);

        // Wait for React to render the hidden div
        setTimeout(async () => {
            const element = invoiceRef.current;
            if (!element) return;

            try {
                // Generate canvas
                const canvas = await html2canvas(element, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');

                // standard A4 size
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Salary_Slip_${salaryRecord.labour.name.replace(' ', '_')}_${salaryRecord.month}_${salaryRecord.year}.pdf`);
            } catch (err) {
                console.error("PDF generation failed:", err);
                alert("Could not generate PDF. Please try again.");
            } finally {
                // Clear out the active invoice
                setActiveInvoice(null);
            }
        }, 100);
    };

    return (
        <>
            <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Salaries & Payroll</h2>
                        <p className="text-secondary">Bulk calculate salaries, track advances, and print PDF invoices.</p>
                    </div>
                    <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setIsCalcModalOpen(true)}>
                        ⚡ Calculate Salary
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', position: 'relative', zIndex: 50 }}>
                    <div style={{ flex: '1 1 200px', zIndex: 10, position: 'relative' }}>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Filter by Site</label>
                        <div style={{ minWidth: '200px' }}>
                            <CustomDropdown
                                name="filterSite"
                                value={filterSite}
                                onChange={(e) => setFilterSite(e.target.value)}
                                options={[
                                    { value: '', label: 'All Sites' },
                                    ...sites.map(s => ({ value: s._id, label: s.name }))
                                ]}
                                placeholder="Filter by Site"
                            />
                        </div>
                    </div>
                    <div style={{ flex: '1 1 150px', zIndex: 9, position: 'relative' }}>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Month</label>
                        <div style={{ minWidth: '150px' }}>
                            <CustomDropdown
                                name="filterMonth"
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(Number(e.target.value))}
                                options={MONTHS}
                                placeholder="Month"
                            />
                        </div>
                    </div>
                    <div style={{ flex: '1 1 120px', zIndex: 8, position: 'relative' }}>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Year</label>
                        <div style={{ minWidth: '120px' }}>
                            <CustomDropdown
                                name="filterYear"
                                value={filterYear}
                                onChange={(e) => setFilterYear(Number(e.target.value))}
                                options={YEARS.map(y => ({ value: y, label: y.toString() }))}
                                placeholder="Year"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                        <span className="spinner"></span> Fetching Payroll Data...
                    </div>
                ) : salaries.length === 0 ? (
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        <span style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem', display: 'block' }}>💸</span>
                        <h3>No Salaries Found</h3>
                        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Try changing the filters or run a new calculation.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                        {salaries.map(salary => (
                            <div key={salary._id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>{salary.labour?.name}</h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>{salary.labour?.mobileNumber}</p>
                                    </div>
                                    <span style={{
                                        padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold',
                                        background: salary.status === 'Paid' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                        color: salary.status === 'Paid' ? '#4ade80' : '#facc15'
                                    }}>
                                        {salary.status}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Present Days</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{salary.presentDays}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Basic Wages</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>₹{salary.basicSalary}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>OT Hours(Extra)</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--accent-primary)' }}>{salary.totalOvertimeHours}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>OT Payout</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--accent-primary)' }}>₹{salary.overtimePay.toFixed(2)}</div>
                                    </div>
                                </div>

                                <div
                                    style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                                    onClick={() => handleAdvanceUpdate(salary._id, salary.advanceTaken)}
                                    title="Click to edit Advance amount"
                                >
                                    <span style={{ color: 'var(--text-secondary)' }}>Advance Taken</span>
                                    <span style={{ fontWeight: 'bold', color: '#f87171' }}>- ₹{salary.advanceTaken} ✏️</span>
                                </div>

                                <div style={{ marginTop: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>Net Payable:</span>
                                    <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4ade80' }}>₹{salary.netPayable.toFixed(0)}</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: 'auto' }}>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '0.5rem', fontSize: '0.85rem', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', borderColor: 'rgba(34, 197, 94, 0.4)' }}
                                        onClick={() => handleMarkPaid(salary._id)}
                                        disabled={salary.status === 'Paid'}
                                    >
                                        {salary.status === 'Paid' ? 'Paid ✓' : 'Mark Paid'}
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                                        onClick={() => generatePDF(salary)}
                                    >
                                        🖨️ Print
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                                        onClick={() => handleDelete(salary._id)}
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>

            {/* Calculate Modal */}
            {
                isCalcModalOpen && createPortal(
                    <div className="modal-overlay">
                        <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-secondary)', padding: '2rem', margin: '5vh auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>Bulk Calculate Salaries</h3>
                                <button onClick={() => setIsCalcModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                            </div>

                            <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                Generate payroll for all workers at a specific site based on recorded Monthly Attendance and Overtime.
                            </p>

                            <form onSubmit={handleCalculate}>
                                <div className="form-group" style={{ zIndex: 10, position: 'relative' }}>
                                    <CustomDropdown
                                        name="siteId"
                                        value={calcForm.siteId}
                                        onChange={(e) => setCalcForm({ ...calcForm, siteId: e.target.value })}
                                        options={sites.map(s => ({ value: s._id, label: s.name }))}
                                        placeholder="Select Target Site..."
                                        required
                                    />
                                    <label className="form-label" style={{ marginTop: '0.5rem' }}>Site</label>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem' }}>
                                    <div className="form-group" style={{ zIndex: 9, position: 'relative' }}>
                                        <CustomDropdown
                                            name="month"
                                            value={calcForm.month}
                                            onChange={(e) => setCalcForm({ ...calcForm, month: Number(e.target.value) })}
                                            options={MONTHS}
                                            required
                                        />
                                        <label className="form-label" style={{ marginTop: '0.5rem' }}>Month</label>
                                    </div>
                                    <div className="form-group" style={{ zIndex: 8, position: 'relative' }}>
                                        <CustomDropdown
                                            name="year"
                                            value={calcForm.year}
                                            onChange={(e) => setCalcForm({ ...calcForm, year: Number(e.target.value) })}
                                            options={YEARS.map(y => ({ value: y, label: y.toString() }))}
                                            required
                                        />
                                        <label className="form-label" style={{ marginTop: '0.5rem' }}>Year</label>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button type="button" className="btn btn-danger" onClick={() => setIsCalcModalOpen(false)} disabled={isCalculating}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={isCalculating || !calcForm.siteId}>
                                        {isCalculating ? 'Computing...' : 'Calculate Now'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Hidden Invoice DOM specific to html2canvas printing mechanism */}
            {
                activeInvoice && (
                    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                        <div ref={invoiceRef} style={{
                            width: '800px', // A4 approx width ratio
                            background: 'white',
                            padding: '40px',
                            fontFamily: 'Arial, sans-serif',
                            color: 'black',
                            boxSizing: 'border-box'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #334155', paddingBottom: '20px', marginBottom: '20px' }}>
                                <div>
                                    <h1 style={{ margin: 0, fontSize: '32px', color: '#0f172a' }}>KARMSATHI</h1>
                                    <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Construction Labour Management</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <h2 style={{ margin: 0, fontSize: '24px', color: '#3b82f6', textTransform: 'uppercase' }}>Salary Slip</h2>
                                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>Period: {MONTHS.find(m => m.value === activeInvoice.month).label} {activeInvoice.year}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '40px', marginBottom: '30px' }}>
                                <div style={{ flex: 1, background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                                    <h3 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' }}>Worker Details</h3>
                                    <div style={{ marginBottom: '5px' }}><strong>Name:</strong> {activeInvoice.labour.name}</div>
                                    <div style={{ marginBottom: '5px' }}><strong>Designation:</strong> {activeInvoice.labour.designation}</div>
                                    <div><strong>Mobile:</strong> {activeInvoice.labour.mobileNumber}</div>
                                </div>
                                <div style={{ flex: 1, background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                                    <h3 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' }}>Work Details</h3>
                                    <div style={{ marginBottom: '5px' }}><strong>Site:</strong> {activeInvoice.site.name}</div>
                                    <div style={{ marginBottom: '5px' }}><strong>Daily Wage:</strong> ₹{activeInvoice.labour.dailyRate}</div>
                                    <div><strong>Status:</strong> <span style={{ color: activeInvoice.status === 'Paid' ? 'green' : 'orange', fontWeight: 'bold' }}>{activeInvoice.status}</span></div>
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                                <thead>
                                    <tr style={{ background: '#cbd5e1' }}>
                                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #94a3b8' }}>Description</th>
                                        <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #94a3b8' }}>Amount / Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '12px', border: '1px solid #cbd5e1' }}>Basic Present Days ({activeInvoice.presentDays} days)</td>
                                        <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right' }}>₹{activeInvoice.basicSalary.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '12px', border: '1px solid #cbd5e1' }}>Overtime Bonus ({activeInvoice.totalOvertimeHours} extra hrs)</td>
                                        <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right' }}>₹{activeInvoice.overtimePay.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '12px', border: '1px solid #cbd5e1', color: '#ef4444' }}>Advance / Deductions</td>
                                        <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#ef4444' }}>- ₹{activeInvoice.advanceTaken.toFixed(2)}</td>
                                    </tr>
                                    <tr style={{ background: '#e2e8f0', fontWeight: 'bold', fontSize: '18px' }}>
                                        <td style={{ padding: '15px', border: '1px solid #94a3b8' }}>Net Payable Amount</td>
                                        <td style={{ padding: '15px', border: '1px solid #94a3b8', textAlign: 'right', color: '#16a34a' }}>₹{activeInvoice.netPayable.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '10px', width: '200px', textAlign: 'center' }}>
                                    Employer Signature
                                </div>
                                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '10px', width: '200px', textAlign: 'center' }}>
                                    Worker Signature
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default Salaries;
