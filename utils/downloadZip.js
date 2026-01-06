import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Get the displayable image source - handles both S3 URLs and base64 data
 * @param {Object} img - Image object with either 'url' or 'data' property
 * @returns {string} Displayable image source
 */
export function getImageSrc(img) {
    if (!img) return '';

    // If it has a URL (S3), use that directly
    if (img.url) {
        return img.url;
    }

    // If it has data, normalize it
    if (img.data) {
        return normalizeImageData(img.data);
    }

    return '';
}

/**
 * Normalize image data to ensure it's a valid data URL
 * @param {string} imageData - Image data (base64, data URL, or URL)
 * @returns {string} Normalized URL or data URL
 */
export function normalizeImageData(imageData) {
    if (!imageData) return '';

    // Already a data URL
    if (imageData.startsWith('data:')) {
        return imageData;
    }

    // HTTP/HTTPS URL (S3, CloudFront, etc.)
    if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
        return imageData;
    }

    // Raw base64 - determine type from first chars or default to PNG
    let mimeType = 'image/png';
    if (imageData.startsWith('/9j/')) {
        mimeType = 'image/jpeg';
    } else if (imageData.startsWith('UklGR')) {
        mimeType = 'image/webp';
    } else if (imageData.startsWith('iVBOR')) {
        mimeType = 'image/png';
    }

    return `data:${mimeType};base64,${imageData}`;
}

/**
 * Check if image is from S3 (URL) or base64
 * @param {Object} img - Image object
 * @returns {boolean} True if S3 URL
 */
export function isS3Image(img) {
    return !!(img?.url && img.url.startsWith('http'));
}

/**
 * Extract raw base64 from image data
 * @param {string} imageData - Image data (base64 or data URL)
 * @returns {string} Raw base64 string
 */
export function extractBase64(imageData) {
    if (!imageData) return '';

    if (imageData.includes(',')) {
        return imageData.split(',')[1];
    }

    return imageData;
}

/**
 * Fetch image from URL and convert to base64
 * @param {string} url - Image URL
 * @returns {Promise<string>} Base64 data URL
 */
async function fetchImageAsBase64(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error('Failed to fetch image:', e);
        return null;
    }
}

/**
 * Download multiple images as a ZIP file
 * Handles both S3 URLs and base64 data
 * @param {Array<{data?: string, url?: string, name: string}>} images - Array of image objects
 * @param {string} zipName - Name for the ZIP file
 */
export async function downloadImagesAsZip(images, zipName = 'generated-images') {
    const zip = new JSZip();
    const imageFolder = zip.folder('images');

    let addedCount = 0;

    for (let index = 0; index < images.length; index++) {
        const img = images[index];

        let base64Data = '';
        let extension = 'png';

        // Handle S3 URL
        if (img.url && img.url.startsWith('http')) {
            const dataUrl = await fetchImageAsBase64(img.url);
            if (dataUrl) {
                base64Data = extractBase64(dataUrl);
                if (dataUrl.includes('image/jpeg')) extension = 'jpg';
                else if (dataUrl.includes('image/webp')) extension = 'webp';
            }
        }
        // Handle base64 data
        else if (img.data) {
            base64Data = extractBase64(img.data);
            if (img.data.includes('image/jpeg')) extension = 'jpg';
            else if (img.data.includes('image/webp')) extension = 'webp';
        }

        if (!base64Data) {
            console.warn(`Image ${index} has no data`);
            continue;
        }

        // Create filename
        const filename = img.name
            ? `${img.name.replace(/[^a-z0-9]/gi, '_')}.${extension}`
            : `image_${index + 1}.${extension}`;

        // Add to zip
        imageFolder.file(filename, base64Data, { base64: true });
        addedCount++;
    }

    if (addedCount === 0) {
        alert('No valid images to download');
        return;
    }

    // Generate and download
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${zipName}.zip`);
}

/**
 * Download a single image
 * Handles both S3 URLs and base64 data
 * Uses a proxy endpoint to bypass CORS and force download
 * @param {Object} img - Image object with url or data
 * @param {string} filename - Filename for download
 */
export async function downloadImage(img, filename = 'image.png') {
    // Handle if just a string is passed
    if (typeof img === 'string') {
        img = { data: img };
    }

    // For S3/HTTP URLs - use our proxy endpoint
    if (img.url && img.url.startsWith('http')) {
        try {
            // Use the download proxy to bypass CORS and force download
            const proxyUrl = `/api/download?url=${encodeURIComponent(img.url)}&filename=${encodeURIComponent(filename)}`;

            const link = document.createElement('a');
            link.href = proxyUrl;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        } catch (e) {
            console.error('Download failed:', e);
            // Fallback: open the proxy URL in current window to trigger download
            window.location.href = `/api/download?url=${encodeURIComponent(img.url)}&filename=${encodeURIComponent(filename)}`;
            return;
        }
    }

    // Handle base64 data
    if (img.data) {
        const normalizedData = normalizeImageData(img.data);
        if (!normalizedData) {
            alert('Unable to download: invalid image data');
            return;
        }

        const link = document.createElement('a');
        link.href = normalizedData;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }

    alert('Unable to download: no image data');
}

