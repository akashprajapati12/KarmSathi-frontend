import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const ProtectedLayout = () => {
    return (
        <div className="app-layout">
            <Navbar />
            <main className="main-content">
                {/* Render nested routes (like Dashboard, etc) here */}
                <Outlet />
            </main>
        </div>
    );
};

export default ProtectedLayout;
