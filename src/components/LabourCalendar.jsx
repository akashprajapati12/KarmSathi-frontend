import { useState, useEffect } from 'react';
import { getMonthlyAttendance, markAttendance } from '../api/labour';
import './LabourCalendar.css';

const LabourCalendar = ({ labourId }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState({});
    const [stats, setStats] = useState({ present: 0, absent: 0, halfDay: 0, overtime: 0, overtimeHours: 0 });
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetchMonthData();
    }, [currentDate.getFullYear(), currentDate.getMonth(), labourId]);

    const fetchMonthData = async () => {
        try {
            setLoading(true);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1; // 1-indexed

            const response = await getMonthlyAttendance(labourId, year, month);
            setAttendanceData(response.records);
            setStats(response.stats);
        } catch (err) {
            console.error("Failed to fetch calendar data:", err);
        } finally {
            setLoading(false);
        }
    };

    // Calendar Helpers
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Render Calendar Grid
    const renderCalendar = () => {
        const blanks = Array(firstDayOfMonth).fill(null);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const totalSlots = [...blanks, ...days];

        return (
            <div className="calendar-grid">
                {dayNames.map(day => <div key={day} className="calendar-day-header">{day}</div>)}

                {totalSlots.map((day, index) => {
                    if (!day) return <div key={`blank-${index}`} className="calendar-day empty"></div>;

                    // Format to match API map
                    const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const dateString = new Date(cellDate.getTime() - (cellDate.getTimezoneOffset() * 60000))
                        .toISOString()
                        .split('T')[0];

                    const status = attendanceData[dateString];

                    let statusClass = '';
                    if (status === 'Present') statusClass = 'status-present';
                    else if (status === 'Absent') statusClass = 'status-absent';
                    else if (status === 'Half Day') statusClass = 'status-half-day';
                    else if (status === 'Overtime') statusClass = 'status-overtime';

                    const isToday = new Date().toDateString() === cellDate.toDateString();

                    return (
                        <div
                            key={`day-${day}`}
                            className={`calendar-day ${statusClass} ${isToday ? 'today' : ''}`}
                            style={{ cursor: 'default' }}
                        >
                            <span className="day-number">{day}</span>
                            {status && <span className="status-dot"></span>}
                        </div>
                    );
                })}
            </div>
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
                {loading && (
                    <div className="calendar-loading-overlay">
                        <span className="spinner"></span>
                    </div>
                )}
                {renderCalendar()}
            </div>

            {/* Summary Stats Footer */}
            <div className="calendar-stats glass-panel">
                <div className="stat-pill present">
                    <span className="stat-count">{stats.present}</span>
                    <span className="stat-label">Present</span>
                </div>
                <div className="stat-pill absent">
                    <span className="stat-count">{stats.absent}</span>
                    <span className="stat-label">Absent</span>
                </div>
                <div className="stat-pill half-day">
                    <span className="stat-count">{stats.halfDay}</span>
                    <span className="stat-label">Half Day</span>
                </div>
                <div className="stat-pill overtime">
                    <span className="stat-count" style={{ fontSize: stats.overtimeHours > 0 ? '1.5rem' : '2rem' }}>
                        {stats.overtime}{stats.overtimeHours > 0 ? `, ${stats.overtimeHours}h` : ''}
                    </span>
                    <span className="stat-label">Overtime</span>
                </div>
            </div>

        </div>
    );
};

export default LabourCalendar;
