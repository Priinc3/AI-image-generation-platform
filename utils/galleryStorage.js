const GALLERY_KEY = 'imagegen_gallery';
const MAX_GALLERY_ITEMS = 50;

/**
 * Get all gallery items from localStorage
 * @returns {Array} Array of gallery items
 */
export function getGalleryItems() {
    if (typeof window === 'undefined') return [];

    try {
        const data = localStorage.getItem(GALLERY_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error reading gallery:', e);
        return [];
    }
}

/**
 * Save a new item to the gallery
 * @param {Object} item - Gallery item to save
 * @param {string} item.type - 'pdp' or 'single'
 * @param {string} item.productName - Name of the product (optional)
 * @param {Array} item.images - Array of generated images
 * @param {string} item.prompt - Original prompt/description
 * @param {Date} item.createdAt - Creation timestamp
 */
export function saveToGallery(item) {
    if (typeof window === 'undefined') return;

    try {
        const gallery = getGalleryItems();

        const newItem = {
            id: Date.now().toString(),
            type: item.type,
            productName: item.productName || 'Untitled',
            images: item.images,
            prompt: item.prompt?.substring(0, 200) || '',
            createdAt: new Date().toISOString(),
        };

        // Add to beginning of array
        gallery.unshift(newItem);

        // Limit gallery size
        if (gallery.length > MAX_GALLERY_ITEMS) {
            gallery.pop();
        }

        localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
        return newItem;
    } catch (e) {
        console.error('Error saving to gallery:', e);
        return null;
    }
}

/**
 * Delete an item from the gallery
 * @param {string} id - ID of the item to delete
 */
export function deleteFromGallery(id) {
    if (typeof window === 'undefined') return;

    try {
        const gallery = getGalleryItems();
        const filtered = gallery.filter(item => item.id !== id);
        localStorage.setItem(GALLERY_KEY, JSON.stringify(filtered));
        return true;
    } catch (e) {
        console.error('Error deleting from gallery:', e);
        return false;
    }
}

/**
 * Clear all gallery items
 */
export function clearGallery() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(GALLERY_KEY);
}

/**
 * Get gallery statistics
 * @returns {Object} Stats object with counts
 */
export function getGalleryStats() {
    const gallery = getGalleryItems();

    const pdpCount = gallery.filter(item => item.type === 'pdp').length;
    const singleCount = gallery.filter(item => item.type === 'single').length;
    const totalImages = gallery.reduce((acc, item) => acc + (item.images?.length || 0), 0);

    return {
        totalSets: gallery.length,
        pdpSets: pdpCount,
        singleImages: singleCount,
        totalImages,
    };
}
