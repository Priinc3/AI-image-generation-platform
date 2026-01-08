'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, signOut } = useAuth();
    const [credits, setCredits] = useState(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        const storedCredits = localStorage.getItem('usedCredits');
        const used = storedCredits ? parseFloat(storedCredits) : 0;
        setCredits({
            total: 300,
            used: used,
            remaining: 300 - used
        });
    }, []);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await signOut();
            router.push('/auth');
        } catch (error) {
            console.error('Error signing out:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const getUserDisplayName = () => {
        if (!user?.email) return '';
        return user.email.split('@')[0];
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link href="/" className="navbar-logo">
                    <span style={{ fontSize: '1.25rem' }}>✨</span>
                    <span>ImageGen AI</span>
                </Link>

                <div className="navbar-nav">
                    <Link
                        href="/"
                        className={`navbar-link ${pathname === '/' ? 'active' : ''}`}
                    >
                        Home
                    </Link>
                    <Link
                        href="/amazon-pdp"
                        className={`navbar-link ${pathname === '/amazon-pdp' ? 'active' : ''}`}
                    >
                        Amazon PDP
                    </Link>
                    <Link
                        href="/single-image"
                        className={`navbar-link ${pathname === '/single-image' ? 'active' : ''}`}
                    >
                        Image Editor
                    </Link>
                    <Link
                        href="/gallery"
                        className={`navbar-link ${pathname === '/gallery' ? 'active' : ''}`}
                    >
                        Gallery
                    </Link>
                    <Link
                        href="/settings"
                        className={`navbar-link ${pathname === '/settings' ? 'active' : ''}`}
                    >
                        Settings
                    </Link>

                    {credits && (
                        <div className="credits-badge">
                            <span className="credits-amount">${credits.remaining.toFixed(2)}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/ $300</span>
                        </div>
                    )}

                    {user && (
                        <div className="user-section">
                            <span className="user-name">
                                {getUserDisplayName()}
                            </span>
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="logout-btn"
                            >
                                {isLoggingOut ? '...' : 'Logout'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}


