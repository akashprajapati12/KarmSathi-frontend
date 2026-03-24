import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../api/auth';

const ForgotPassword = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSendCode = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            const res = await forgotPassword(email);
            setMessage(res.message);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send verification code.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            const res = await resetPassword({ email, code, newPassword });
            setMessage(res.message);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="center-layout animate-fade-in">
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px' }}>
                <div className="text-center" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '2rem' }}>Forgot Password</h2>
                    <p className="text-secondary">Reset your KarmSathi password</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}

                {step === 1 && (
                    <form onSubmit={handleSendCode}>
                        <div className="form-group">
                            <input
                                type="email"
                                className="form-input"
                                placeholder="Email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <label className="form-label" htmlFor="email">Registered Email</label>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isLoading}
                            style={{ marginTop: '1rem', width: '100%' }}
                        >
                            {isLoading ? 'Sending Code...' : 'Send Verification Code'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleResetPassword}>
                        <div className="form-group">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Verification Code"
                                id="code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                            />
                            <label className="form-label" htmlFor="code">Verification Code</label>
                        </div>

                        <div className="form-group">
                            <input
                                type="password"
                                className="form-input"
                                placeholder="New Password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength="6"
                            />
                            <label className="form-label" htmlFor="newPassword">New Password</label>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isLoading}
                            style={{ marginTop: '1rem', width: '100%' }}
                        >
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <p className="text-center text-sm" style={{ marginTop: '2rem' }}>
                    Remember your password? <Link to="/login">Login here</Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
