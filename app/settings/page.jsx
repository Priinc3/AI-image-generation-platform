'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
    getAWSSettings,
    saveAWSSettings,
    getWebhookSettings,
    saveWebhookSettings,
} from '@/utils/settingsStorage';

export default function SettingsPage() {
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
    const [isSaving, setIsSaving] = useState(false);

    // Load settings from localStorage on mount
    useEffect(() => {
        const aws = getAWSSettings();
        const webhooks = getWebhookSettings();
        if (aws.accessKeyId) setAwsSettings(aws);
        if (webhooks.pdpWebhookUrl) setWebhookSettings(webhooks);
    }, []);

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            saveAWSSettings(awsSettings);
            saveWebhookSettings(webhookSettings);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            console.error('Error saving settings:', e);
        } finally {
            setIsSaving(false);
        }
    };

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
