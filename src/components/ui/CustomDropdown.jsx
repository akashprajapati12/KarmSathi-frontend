import React, { useState, useRef, useEffect } from 'react';

const CustomDropdown = ({ name, value, onChange, options, placeholder, disabled, required }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Find the currently selected option to show its label
    const selectedOption = options.find(opt => String(opt.value) === String(value));

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        if (!disabled) {
            onChange({ target: { name, value: optionValue } });
            setIsOpen(false);
        }
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%', zIndex: isOpen ? 9999 : 1 }}>
            {/* Hidden native input for required validation if needed */}
            {required && <input type="hidden" name={name} value={value || ''} required={required} />}

            <div
                className={`form-input focus-within ${disabled ? 'disabled' : ''}`}
                style={{
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: disabled ? 0.6 : 1,
                    userSelect: 'none',
                    borderColor: isOpen ? 'var(--accent-primary)' : 'var(--glass-border)',
                    boxShadow: isOpen ? '0 0 0 3px rgba(99, 102, 241, 0.2)' : 'none',
                    background: 'rgba(15, 23, 42, 0.6)'
                }}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span style={{
                    color: selectedOption ? 'var(--text-primary)' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span style={{
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                    color: 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    marginLeft: '0.5rem'
                }}>
                    ▼
                </span>
            </div>

            {isOpen && !disabled && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        zIndex: 99999,
                        maxHeight: '250px',
                        overflowY: 'auto',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--glass-border)'
                    }}
                >
                    {options.length === 0 ? (
                        <div style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            No options available
                        </div>
                    ) : (
                        options.map((opt) => (
                            <div
                                key={opt.value}
                                onClick={() => handleSelect(opt.value)}
                                style={{
                                    padding: '0.75rem 1rem',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    background: String(value) === String(opt.value) ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                    color: String(value) === String(opt.value) ? 'var(--accent-primary)' : 'var(--text-primary)',
                                    marginBottom: '4px',
                                    transition: 'background 0.2s',
                                    wordBreak: 'break-word'
                                }}
                                onMouseEnter={(e) => {
                                    if (String(value) !== String(opt.value)) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                }}
                                onMouseLeave={(e) => {
                                    if (String(value) !== String(opt.value)) e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                {opt.label}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomDropdown;
