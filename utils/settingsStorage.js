const SETTINGS_KEY = 'imagegen_settings';

/**
 * Get all settings from localStorage
 */
export function getSettings() {
    if (typeof window === 'undefined') return {};
    try {
        const data = localStorage.getItem(SETTINGS_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('Error reading settings:', e);
        return {};
    }
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings) {
    if (typeof window === 'undefined') return;
    try {
        const current = getSettings();
        const updated = { ...current, ...settings };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
        return true;
    } catch (e) {
        console.error('Error saving settings:', e);
        return false;
    }
}

/**
 * Get AWS settings
 */
export function getAWSSettings() {
    const settings = getSettings();
    return {
        accessKeyId: settings.aws_access_key_id || '',
        secretAccessKey: settings.aws_secret_access_key || '',
        region: settings.aws_region || 'ap-south-1',
        bucket: settings.aws_bucket || 'amazon-image-data',
    };
}

/**
 * Save AWS settings
 */
export function saveAWSSettings(awsSettings) {
    return saveSettings({
        aws_access_key_id: awsSettings.accessKeyId,
        aws_secret_access_key: awsSettings.secretAccessKey,
        aws_region: awsSettings.region,
        aws_bucket: awsSettings.bucket,
    });
}

/**
 * Get n8n webhook URLs
 */
export function getWebhookSettings() {
    const settings = getSettings();
    return {
        pdpWebhookUrl: settings.n8n_pdp_webhook_url || '',
        singleWebhookUrl: settings.n8n_single_webhook_url || '',
    };
}

/**
 * Save n8n webhook URLs
 */
export function saveWebhookSettings(webhookSettings) {
    return saveSettings({
        n8n_pdp_webhook_url: webhookSettings.pdpWebhookUrl,
        n8n_single_webhook_url: webhookSettings.singleWebhookUrl,
    });
}

/**
 * Clear all settings
 */
export function clearSettings() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SETTINGS_KEY);
}
