import { useState, useEffect } from 'react';
import { getMonthlyAttendance } from '../api/labour';
import './LabourCalendar.css';

const LabourCalendar = ({ labourId, highlightedSiteId }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState({});
    const [stats, setStats] = useState({ present: 0, absent: 0, halfDay: 0, overtime: 0, overtimeHours: 0 });
    const [loading, setLoading] = useState(true);

    // Sync with highlightedSiteId for debugging or potential effects
    useEffect(() => {
        if (highlightedSiteId) {
            console.log("Calendar Filter Active:", highlightedSiteId);
        }
    }, [highlightedSiteId]);

    useEffect(() => {
        fetchMonthData();
    }, [currentDate.getFullYear(), currentDate.getMonth(), labourId]);

    const fetchMonthData = async () => {
        try {
            setLoading(true);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1; // 1-indexed

            const response = await getMonthlyAttendance(labourId, year, month);
            // Expected response.records: { "YYYY-MM-DD": { status, siteId, siteName } }
            setAttendanceData(response.records || {});
            setStats(response.stats || { present: 0, absent: 0, halfDay: 0, overtime: 0, overtimeHours: 0 });
        } catch (err) {
            console.error("Failed to fetch calendar data:", err);
            setAttendanceData({});
        } finally {
            setLoading(false);
        }
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const renderCalendar = () => {
        const blanks = Array(firstDayOfMonth).fill(null);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const totalSlots = [...blanks, ...days];

        // Compute display stats based on filter
        let displayStats = stats;
        if (highlightedSiteId) {
            const fStats = { present: 0, absent: 0, halfDay: 0, overtime: 0, overtimeHours: 0 };
            Object.values(attendanceData).forEach(record => {
                const rSiteId = record?.siteId ? String(record.siteId).trim() : null;
                const hSiteId = String(highlightedSiteId).trim();

                if (rSiteId === hSiteId) {
                    const status = record?.status;
                    if (status === 'Present') fStats.present++;
                    else if (status === 'Absent') fStats.absent++;
                    else if (status === 'Half Day') fStats.halfDay++;
                    else if (status === 'Overtime') {
                        fStats.overtime++;
                        if (record.hours > 8) fStats.overtimeHours += (record.hours - 8);
                    }
                }
            });
            displayStats = fStats;
        }

        return (
            <>
                <div className="calendar-grid">
                    {dayNames.map(day => <div key={day} className="calendar-day-header">{day}</div>)}
                    {totalSlots.map((day, index) => {
                        if (!day) return <div key={`blank-${index}`} className="calendar-day empty"></div>;

                        const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const dateString = new Date(cellDate.getTime() - (cellDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

                        const record = attendanceData[dateString];
                        const rSiteId = record?.siteId ? String(record.siteId).trim() : "unknown";
                        const hSiteId = highlightedSiteId ? String(highlightedSiteId).trim() : null;

                        // Logic: If a site is selected, only show color if it matches.
                        // Otherwise, if no site is selected, show all colors.
                        let activeStatus = null;
                        let activeSiteName = '';

                        if (hSiteId) {
                            if (rSiteId === hSiteId) {
                                activeStatus = record?.status;
                                activeSiteName = record?.siteName;
                            }
                            // else: activeStatus remains null (appears unmarked)
                        } else {
                            activeStatus = record?.status;
                            activeSiteName = record?.siteName;
                        }

                        let statusClass = '';
                        if (activeStatus === 'Present') statusClass = 'status-present';
                        else if (activeStatus === 'Absent') statusClass = 'status-absent';
                        else if (activeStatus === 'Half Day') statusClass = 'status-half-day';
                        else if (activeStatus === 'Overtime') statusClass = 'status-overtime';

                        const isToday = new Date().toDateString() === cellDate.toDateString();
                        const isHighlight = hSiteId && rSiteId === hSiteId;

                        return (
                            <div
                                key={`day-${day}`}
                                className={`calendar-day ${statusClass} ${isToday ? 'today' : ''} ${isHighlight ? 'highlighted-site' : ''}`}
                                title={activeSiteName ? `Site: ${activeSiteName}` : ''}
                            >
                                <span className="day-number">{day}</span>
                                {activeStatus && <span className="status-dot"></span>}
                            </div>
                        );
                    })}
                </div>

                <div className="calendar-stats glass-panel">
                    <div className="stat-pill present">
                        <span className="stat-count">{displayStats.present}</span>
                        <span className="stat-label">Present</span>
                    </div>
                    <div className="stat-pill absent">
                        <span className="stat-count">{displayStats.absent}</span>
                        <span className="stat-label">Absent</span>
                    </div>
                    <div className="stat-pill half-day">
                        <span className="stat-count">{displayStats.halfDay}</span>
                        <span className="stat-label">Half Day</span>
                    </div>
                    <div className="stat-pill overtime">
                        <span className="stat-count">
                            {displayStats.overtime}{displayStats.overtimeHours > 0 ? `, ${displayStats.overtimeHours.toFixed(1)}h` : ''}
                        </span>
                        <span className="stat-label">Overtime</span>
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="labour-calendar-wrapper">
            <div className="calendar-header glass-panel">
                <button className="nav-arrow-btn" onClick={prevMonth}>&lt;</button>
                <h3 style={{ margin: 0 }}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                <button className="nav-arrow-btn" onClick={nextMonth}>&gt;</button>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1rem', position: 'relative' }}>
                {loading && <div className="calendar-loading-overlay"><span className="spinner"></span></div>}
                {renderCalendar()}
            </div>
        </div>
    );
};

export default LabourCalendar;
