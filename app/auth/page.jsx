'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AuthPage() {
    const router = useRouter();
    const { signIn, signUp, user, loading } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Redirect if already logged in
    if (!loading && user) {
        router.push('/');
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsSubmitting(true);

        try {
            if (isLogin) {
                await signIn(email, password);
                router.push('/');
            } else {
                await signUp(email, password);
                setSuccessMessage('Account created! Check your email to verify, then log in.');
                setIsLogin(true);
            }
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'var(--bg-secondary)',
            }}>
                <div className="preview-spinner"></div>
            </div>
        );
    }

    return (
        <main style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
            padding: 'var(--spacing-xl)',
        }}>
            <div className="animate-fade-in" style={{
                width: '100%',
                maxWidth: '420px',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '8px' }}>✨</div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        ImageGen AI
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                        {isLogin ? 'Welcome back!' : 'Create your account'}
                    </p>
                </div>

                {/* Card */}
                <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
                    {/* Tab Toggle */}
                    <div style={{
                        display: 'flex',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '4px',
                        marginBottom: 'var(--spacing-xl)',
                    }}>
                        <button
                            type="button"
                            onClick={() => { setIsLogin(true); setError(''); }}
                            style={{
                                flex: 1,
                                padding: '10px',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                background: isLogin ? 'var(--bg-card)' : 'transparent',
                                color: isLogin ? 'var(--text-primary)' : 'var(--text-muted)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isLogin ? 'var(--shadow-sm)' : 'none',
                            }}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsLogin(false); setError(''); }}
                            style={{
                                flex: 1,
                                padding: '10px',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                background: !isLogin ? 'var(--bg-card)' : 'transparent',
                                color: !isLogin ? 'var(--text-primary)' : 'var(--text-muted)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: !isLogin ? 'var(--shadow-sm)' : 'none',
                            }}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Success Message */}
                    {successMessage && (
                        <div className="success-message animate-fade-in" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            ✓ {successMessage}
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="error-message animate-fade-in" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                            />
                            {!isLogin && (
                                <p className="form-hint">Password must be at least 6 characters</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={isSubmitting}
                            style={{
                                width: '100%',
                                marginTop: 'var(--spacing-md)',
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner"></span>
                                    {isLogin ? 'Signing in...' : 'Creating account...'}
                                </>
                            ) : (
                                isLogin ? 'Sign In' : 'Create Account'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p style={{
                    textAlign: 'center',
                    marginTop: 'var(--spacing-lg)',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                }}>
                    By continuing, you agree to our Terms of Service
                </p>
            </div>
        </main>
    );
}
