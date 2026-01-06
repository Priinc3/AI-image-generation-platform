'use client';

import { useState } from 'react';

export default function CollapsibleSection({ title, defaultOpen = false, children }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="collapsible">
            <button
                type="button"
                className="collapsible-header"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{title}</span>
                <span className={`collapsible-icon ${isOpen ? 'open' : ''}`}>
                    ▼
                </span>
            </button>
            {isOpen && (
                <div className="collapsible-content">
                    {children}
                </div>
            )}
        </div>
    );
}
