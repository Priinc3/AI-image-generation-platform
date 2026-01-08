'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const pathname = usePathname();
    const [credits, setCredits] = useState(null);

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
                </div>
            </div>
        </nav>
    );
}
