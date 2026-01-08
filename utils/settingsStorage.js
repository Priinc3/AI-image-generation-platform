import { supabase } from './supabase';

const SETTINGS_KEY = 'imagegen_settings';

/**
 * Get all settings from localStorage
 * @returns {Object} Settings object
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
 * @param {Object} settings - Settings to save
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
 * @returns {Object} AWS configuration
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
 * @param {Object} awsSettings - AWS configuration
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
 * @returns {Object} Webhook URLs
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
 * @param {Object} webhookSettings - Webhook URLs
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

// ================================
// SUPABASE CLOUD SYNC FUNCTIONS
// ================================

/**
 * Fetch user settings from Supabase
 * @param {string} userId - User UUID
 * @returns {Object} Settings object
 */
export async function fetchSettingsFromSupabase(userId) {
    try {
        const { data, error } = await supabase
            .from('imagegen_user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No settings found - that's okay for new users
                return null;
            }
            throw error;
        }

        return data;
    } catch (e) {
        console.error('Error fetching settings from Supabase:', e);
        return null;
    }
}

/**
 * Save user settings to Supabase
 * @param {string} userId - User UUID
 * @param {Object} awsSettings - AWS configuration
 * @param {Object} webhookSettings - Webhook URLs
 */
export async function saveSettingsToSupabase(userId, awsSettings, webhookSettings) {
    try {
        const settingsData = {
            user_id: userId,
            aws_access_key_id: awsSettings.accessKeyId,
            aws_secret_access_key: awsSettings.secretAccessKey,
            aws_region: awsSettings.region,
            aws_bucket: awsSettings.bucket,
            n8n_pdp_webhook_url: webhookSettings.pdpWebhookUrl,
            n8n_single_webhook_url: webhookSettings.singleWebhookUrl,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('imagegen_user_settings')
            .upsert(settingsData, {
                onConflict: 'user_id',
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (e) {
        console.error('Error saving settings to Supabase:', e);
        throw e;
    }
}

/**
 * Load settings from Supabase and sync to localStorage
 * @param {string} userId - User UUID
 */
export async function syncSettingsFromCloud(userId) {
    const cloudSettings = await fetchSettingsFromSupabase(userId);

    if (cloudSettings) {
        // Sync to localStorage
        saveSettings({
            aws_access_key_id: cloudSettings.aws_access_key_id || '',
            aws_secret_access_key: cloudSettings.aws_secret_access_key || '',
            aws_region: cloudSettings.aws_region || 'ap-south-1',
            aws_bucket: cloudSettings.aws_bucket || 'amazon-image-data',
            n8n_pdp_webhook_url: cloudSettings.n8n_pdp_webhook_url || '',
            n8n_single_webhook_url: cloudSettings.n8n_single_webhook_url || '',
        });

        return cloudSettings;
    }

    return null;
}

