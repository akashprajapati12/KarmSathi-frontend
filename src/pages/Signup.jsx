import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Signup = () => {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        if (password.length < 6) {
            return setError('Password must be at least 6 characters');
        }

        setIsLoading(true);

        try {
            await register(name, username, email, password);
            // AuthContext will update, navigate to dashboard
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to register. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="center-layout animate-fade-in">
            <div className="glass-panel" style={{ width: '100%', maxWidth: '450px' }}>
                <div className="text-center" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '2rem' }}>Get Started</h2>
                    <p className="text-secondary">Create your new KarmSathi account</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Full Name"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <label className="form-label" htmlFor="name">Full Name</label>
                    </div>

                    <div className="form-group">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Username"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        <label className="form-label" htmlFor="username">Username</label>
                    </div>

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
                        <label className="form-label" htmlFor="email">Email</label>
                    </div>

                    <div className="form-group">
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <label className="form-label" htmlFor="password">Password</label>
                    </div>

                    <div className="form-group">
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Confirm Password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isLoading}
                        style={{ marginTop: '1rem' }}
                    >
                        {isLoading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>

                <p className="text-center text-sm" style={{ marginTop: '2rem' }}>
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;
