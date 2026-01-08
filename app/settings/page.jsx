'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import {
    getAWSSettings,
    saveAWSSettings,
    getWebhookSettings,
    saveWebhookSettings,
    saveSettingsToSupabase,
    syncSettingsFromCloud,
} from '@/utils/settingsStorage';

export default function SettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [awsSettings, setAwsSettings] = useState({
        accessKeyId: '',
        secretAccessKey: '',
        region: 'ap-south-1',
        bucket: 'amazon-image-data',
    });

    const [webhookSettings, setWebhookSettings] = useState({
        pdpWebhookUrl: '',
        singleWebhookUrl: '',
    });

    const [saved, setSaved] = useState(false);
    const [showSecrets, setShowSecrets] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth');
        }
    }, [user, authLoading, router]);

    // Load settings from cloud
    useEffect(() => {
        const loadSettings = async () => {
            if (!user) return;

            setIsLoading(true);
            try {
                // Try to sync from cloud first
                const cloudSettings = await syncSettingsFromCloud(user.id);

                if (cloudSettings) {
                    setAwsSettings({
                        accessKeyId: cloudSettings.aws_access_key_id || '',
                        secretAccessKey: cloudSettings.aws_secret_access_key || '',
                        region: cloudSettings.aws_region || 'ap-south-1',
                        bucket: cloudSettings.aws_bucket || 'amazon-image-data',
                    });
                    setWebhookSettings({
                        pdpWebhookUrl: cloudSettings.n8n_pdp_webhook_url || '',
                        singleWebhookUrl: cloudSettings.n8n_single_webhook_url || '',
                    });
                } else {
                    // Fall back to localStorage
                    const aws = getAWSSettings();
                    const webhooks = getWebhookSettings();
                    if (aws.accessKeyId) setAwsSettings(aws);
                    if (webhooks.pdpWebhookUrl) setWebhookSettings(webhooks);
                }
            } catch (e) {
                console.error('Error loading settings:', e);
                // Fall back to localStorage
                const aws = getAWSSettings();
                const webhooks = getWebhookSettings();
                if (aws.accessKeyId) setAwsSettings(aws);
                if (webhooks.pdpWebhookUrl) setWebhookSettings(webhooks);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, [user]);

    const handleSaveAll = async () => {
        if (!user) return;

        setIsSaving(true);
        setError('');

        try {
            // Save to localStorage first (immediate feedback)
            saveAWSSettings(awsSettings);
            saveWebhookSettings(webhookSettings);

            // Save to Supabase
            await saveSettingsToSupabase(user.id, awsSettings, webhookSettings);

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            console.error('Error saving settings:', e);
            setError('Failed to save to cloud. Settings saved locally.');
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    // Loading states
    if (authLoading || isLoading) {
        return (
            <>
                <Navbar />
                <main className="page-wrapper">
                    <div className="container">
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '60vh',
                        }}>
                            <div className="preview-spinner"></div>
                        </div>
                    </div>
                </main>
            </>
        );
    }

    if (!user) return null;

    return (
        <>
            <Navbar />
            <main className="page-wrapper">
                <div className="container">
                    <div className="settings-page animate-fade-in">
                        {/* Header */}
                        <div className="section-header">
                            <h1 className="section-title">Settings</h1>
                            <p className="section-subtitle">
                                Configure your AWS and n8n integration settings
                            </p>
                        </div>

                        {/* Success Message */}
                        {saved && (
                            <div className="success-message animate-fade-in">
                                ✓ Settings saved successfully!
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="error-message animate-fade-in">
                                ⚠️ {error}
                            </div>
                        )}

                        {/* Cloud Sync Info */}
                        <div className="settings-warning" style={{
                            background: 'rgba(79, 70, 229, 0.1)',
                            borderColor: 'var(--accent-primary)',
                        }}>
                            ☁️ <strong>Cloud Sync:</strong> Your settings are synced to your account.
                            They'll be available on any device where you sign in.
                        </div>

                        {/* AWS Settings */}
                        <div className="settings-section">
                            <h2 className="settings-section-title">
                                ☁️ AWS S3 Configuration
                            </h2>
                            <p className="settings-section-desc">
                                Configure your AWS credentials for image storage
                            </p>

                            <div className="settings-form">
                                <div className="form-group">
                                    <label className="form-label">Access Key ID</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="AKIA..."
                                        value={awsSettings.accessKeyId}
                                        onChange={(e) => setAwsSettings({
                                            ...awsSettings,
                                            accessKeyId: e.target.value
                                        })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        Secret Access Key
                                        <button
                                            type="button"
                                            className="toggle-visibility"
                                            onClick={() => setShowSecrets(!showSecrets)}
                                        >
                                            {showSecrets ? '🙈 Hide' : '👁️ Show'}
                                        </button>
                                    </label>
                                    <input
                                        type={showSecrets ? "text" : "password"}
                                        className="form-input"
                                        placeholder="Your secret access key"
                                        value={awsSettings.secretAccessKey}
                                        onChange={(e) => setAwsSettings({
                                            ...awsSettings,
                                            secretAccessKey: e.target.value
                                        })}
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Region</label>
                                        <select
                                            className="form-select"
                                            value={awsSettings.region}
                                            onChange={(e) => setAwsSettings({
                                                ...awsSettings,
                                                region: e.target.value
                                            })}
                                        >
                                            <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                                            <option value="us-east-1">US East (N. Virginia)</option>
                                            <option value="us-west-2">US West (Oregon)</option>
                                            <option value="eu-west-1">Europe (Ireland)</option>
                                            <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Bucket Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="my-bucket-name"
                                            value={awsSettings.bucket}
                                            onChange={(e) => setAwsSettings({
                                                ...awsSettings,
                                                bucket: e.target.value
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* n8n Webhook Settings */}
                        <div className="settings-section">
                            <h2 className="settings-section-title">
                                🔗 n8n Webhook URLs
                            </h2>
                            <p className="settings-section-desc">
                                Configure your n8n workflow webhook endpoints
                            </p>

                            <div className="settings-form">
                                <div className="form-group">
                                    <label className="form-label">Amazon PDP Webhook URL</label>
                                    <input
                                        type="url"
                                        className="form-input"
                                        placeholder="https://your-n8n.app/webhook/amazon-pdp"
                                        value={webhookSettings.pdpWebhookUrl}
                                        onChange={(e) => setWebhookSettings({
                                            ...webhookSettings,
                                            pdpWebhookUrl: e.target.value
                                        })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Single Image Webhook URL</label>
                                    <input
                                        type="url"
                                        className="form-input"
                                        placeholder="https://your-n8n.app/webhook/single-image"
                                        value={webhookSettings.singleWebhookUrl}
                                        onChange={(e) => setWebhookSettings({
                                            ...webhookSettings,
                                            singleWebhookUrl: e.target.value
                                        })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Save All Button */}
                        <div className="settings-actions">
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleSaveAll}
                                disabled={isSaving}
                                style={{ minWidth: '200px' }}
                            >
                                {isSaving ? (
                                    <>
                                        <span className="spinner"></span>
                                        Saving...
                                    </>
                                ) : (
                                    '💾 Save All Settings'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}

