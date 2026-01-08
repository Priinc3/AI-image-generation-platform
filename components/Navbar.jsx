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
        // Fetch credits from localStorage or API
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

    // Get user display name (email without @domain)
    const getUserDisplayName = () => {
        if (!user?.email) return '';
        return user.email.split('@')[0];
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link href="/" className="navbar-logo">
                    <div className="navbar-logo-icon">✨</div>
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
                        ⚙️ Settings
                    </Link>

                    {credits && (
                        <div className="credits-badge">
                            <span>💳</span>
                            <span className="credits-amount">${credits.remaining.toFixed(2)}</span>
                            <span style={{ color: 'var(--text-muted)' }}>/ $300</span>
                        </div>
                    )}

                    {/* User section */}
                    {user && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginLeft: '8px',
                            paddingLeft: '16px',
                            borderLeft: '1px solid var(--border-color)',
                        }}>
                            <span style={{
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)',
                            }}>
                                👤 {getUserDisplayName()}
                            </span>
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                style={{
                                    padding: '6px 12px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'var(--bg-card)';
                                    e.target.style.color = 'var(--text-primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'var(--bg-secondary)';
                                    e.target.style.color = 'var(--text-secondary)';
                                }}
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

