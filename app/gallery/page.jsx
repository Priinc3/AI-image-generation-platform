'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ImageLightbox from '@/components/ImageLightbox';
import { downloadImagesAsZip, downloadImage, getImageSrc } from '@/utils/downloadZip';
import { getGalleryItems, getGalleryStats, deleteFromGallery, clearGallery } from '@/utils/galleryStorage';
import { getAWSSettings } from '@/utils/settingsStorage';

export default function GalleryPage() {
    // Local gallery (localStorage)
    const [localItems, setLocalItems] = useState([]);
    const [localStats, setLocalStats] = useState({ totalSets: 0, pdpSets: 0, singleImages: 0, totalImages: 0 });

    // S3 images
    const [s3Images, setS3Images] = useState([]);
    const [s3Loading, setS3Loading] = useState(false);
    const [s3Error, setS3Error] = useState('');

    // UI state
    const [activeTab, setActiveTab] = useState('s3'); // 's3' or 'local'
    const [filter, setFilter] = useState('all');
    const [lightboxImages, setLightboxImages] = useState([]);
    const [lightboxIndex, setLightboxIndex] = useState(-1);

    useEffect(() => {
        loadLocalGallery();
        loadS3Gallery();
    }, []);

    const loadLocalGallery = () => {
        const galleryItems = getGalleryItems();
        setLocalItems(galleryItems);
        setLocalStats(getGalleryStats());
    };

    const loadS3Gallery = async () => {
        setS3Loading(true);
        setS3Error('');

        try {
            const awsSettings = getAWSSettings();

            if (!awsSettings.accessKeyId || !awsSettings.secretAccessKey) {
                setS3Error('AWS credentials not configured. Go to Settings to add them.');
                setS3Loading(false);
                return;
            }

            const response = await fetch('/api/s3/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accessKeyId: awsSettings.accessKeyId,
                    secretAccessKey: awsSettings.secretAccessKey,
                    region: awsSettings.region,
                    bucket: awsSettings.bucket,
                    maxKeys: 100,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setS3Images(data.images || []);
            } else {
                setS3Error(data.error || 'Failed to load S3 images');
            }
        } catch (err) {
            console.error('S3 load error:', err);
            setS3Error('Failed to connect to S3');
        } finally {
            setS3Loading(false);
        }
    };

    const handleDeleteLocal = (id) => {
        if (confirm('Are you sure you want to delete this item from local gallery?')) {
            deleteFromGallery(id);
            loadLocalGallery();
        }
    };

    const handleDownloadLocal = (item) => {
        if (item.images.length === 1) {
            downloadImage(item.images[0], item.images[0].name || 'image.png');
        } else {
            downloadImagesAsZip(item.images, item.productName?.replace(/[^a-z0-9]/gi, '_') || 'images');
        }
    };

    const handleDownloadS3Image = (img) => {
        downloadImage(img, img.name || 'image.png');
    };

    const openLightbox = (images, startIndex = 0) => {
        setLightboxImages(images);
        setLightboxIndex(startIndex);
    };

    const closeLightbox = () => {
        setLightboxImages([]);
        setLightboxIndex(-1);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatSize = (bytes) => {
        if (!bytes) return '';
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(1)} KB`;
        return `${(kb / 1024).toFixed(1)} MB`;
    };

    const filteredLocalItems = localItems.filter(item => {
        if (filter === 'all') return true;
        return item.type === filter;
    });

    return (
        <>
            <Navbar />
            <main className="page-wrapper">
                <div className="container">
                    <div className="gallery-page">
                        {/* Header */}
                        <div className="section-header">
                            <h1 className="section-title">Your Gallery</h1>
                            <p className="section-subtitle">
                                View images from S3 cloud storage or local browser cache
                            </p>
                        </div>

                        {/* Tab Switcher */}
                        <div className="gallery-tabs">
                            <button
                                className={`tab-btn ${activeTab === 's3' ? 'active' : ''}`}
                                onClick={() => setActiveTab('s3')}
                            >
                                ☁️ S3 Cloud ({s3Images.length})
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'local' ? 'active' : ''}`}
                                onClick={() => setActiveTab('local')}
                            >
                                💾 Local Cache ({localStats.totalImages})
                            </button>
                        </div>

                        {/* S3 Gallery Tab */}
                        {activeTab === 's3' && (
                            <div className="s3-gallery">
                                {/* Refresh Button */}
                                <div className="gallery-header">
                                    <span>{s3Images.length} images in S3 bucket</span>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={loadS3Gallery}
                                        disabled={s3Loading}
                                    >
                                        {s3Loading ? '⏳ Loading...' : '🔄 Refresh'}
                                    </button>
                                </div>

                                {/* Error Message */}
                                {s3Error && (
                                    <div className="error-message" style={{
                                        padding: 'var(--spacing-md)',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid var(--error)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--error)',
                                        marginBottom: 'var(--spacing-lg)'
                                    }}>
                                        {s3Error}
                                        {s3Error.includes('Settings') && (
                                            <a href="/settings" style={{
                                                marginLeft: '8px',
                                                color: 'var(--accent-primary)',
                                                textDecoration: 'underline'
                                            }}>
                                                Go to Settings →
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* S3 Images Grid */}
                                {s3Images.length > 0 ? (
                                    <div className="s3-images-grid">
                                        {s3Images.map((img, index) => (
                                            <div key={img.key || index} className="s3-image-card">
                                                <div
                                                    className="s3-image-preview"
                                                    onClick={() => openLightbox(s3Images.map(i => ({
                                                        url: i.url,
                                                        name: i.name
                                                    })), index)}
                                                >
                                                    <img
                                                        src={img.url}
                                                        alt={img.name}
                                                        onError={(e) => {
                                                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="gray">Failed</text></svg>';
                                                        }}
                                                    />
                                                </div>
                                                <div className="s3-image-info">
                                                    <span className="s3-image-name" title={img.name}>
                                                        {img.name?.length > 25 ? img.name.substring(0, 25) + '...' : img.name}
                                                    </span>
                                                    <span className="s3-image-meta">
                                                        {formatSize(img.size)} • {formatDate(img.lastModified)}
                                                    </span>
                                                </div>
                                                <div className="s3-image-actions">
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => handleDownloadS3Image(img)}
                                                    >
                                                        ↓ Download
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : !s3Loading && !s3Error && (
                                    <div className="gallery-empty">
                                        <div className="gallery-empty-icon">☁️</div>
                                        <p>No images in S3 bucket yet</p>
                                        <p style={{ fontSize: '0.9rem', marginTop: 'var(--spacing-sm)' }}>
                                            Generate some images to see them here
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Local Gallery Tab */}
                        {activeTab === 'local' && (
                            <div className="local-gallery">
                                {/* Stats */}
                                <div className="gallery-stats">
                                    <div className="stat-card">
                                        <div className="stat-value">{localStats.totalSets}</div>
                                        <div className="stat-label">Sessions</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{localStats.pdpSets}</div>
                                        <div className="stat-label">PDP Sets</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{localStats.singleImages}</div>
                                        <div className="stat-label">Single</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{localStats.totalImages}</div>
                                        <div className="stat-label">Total</div>
                                    </div>
                                </div>

                                {/* Filters */}
                                <div className="gallery-filters">
                                    <button
                                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                                        onClick={() => setFilter('all')}
                                    >
                                        All
                                    </button>
                                    <button
                                        className={`filter-btn ${filter === 'pdp' ? 'active' : ''}`}
                                        onClick={() => setFilter('pdp')}
                                    >
                                        Amazon PDP
                                    </button>
                                    <button
                                        className={`filter-btn ${filter === 'single' ? 'active' : ''}`}
                                        onClick={() => setFilter('single')}
                                    >
                                        Single Images
                                    </button>
                                </div>

                                {/* Gallery List */}
                                {filteredLocalItems.length > 0 ? (
                                    <div className="gallery-list">
                                        {filteredLocalItems.map((item) => (
                                            <div key={item.id} className="gallery-item-card">
                                                <div className="gallery-item-header">
                                                    <div className="gallery-item-info">
                                                        <h3>{item.productName}</h3>
                                                        <div className="gallery-item-meta">
                                                            <span>
                                                                {item.type === 'pdp' ? '📦 Amazon PDP' : '🎨 Single Image'}
                                                            </span>
                                                            <span>{item.images?.length || 0} images</span>
                                                            <span>{formatDate(item.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="gallery-item-actions">
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={() => handleDownloadLocal(item)}
                                                        >
                                                            ↓ Download
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={() => handleDeleteLocal(item.id)}
                                                            style={{ color: 'var(--error)' }}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Thumbnails */}
                                                <div className="gallery-item-thumbnails">
                                                    {item.images?.slice(0, 6).map((img, index) => {
                                                        const imgSrc = getImageSrc(img);
                                                        return (
                                                            <div
                                                                key={index}
                                                                className="gallery-thumbnail"
                                                                onClick={() => openLightbox(item.images, index)}
                                                            >
                                                                {imgSrc ? (
                                                                    <img
                                                                        src={imgSrc}
                                                                        alt={img.name || `Image ${index + 1}`}
                                                                        onError={(e) => {
                                                                            e.target.style.display = 'none';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                                        No data
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="gallery-empty" style={{ marginTop: 'var(--spacing-2xl)' }}>
                                        <div className="gallery-empty-icon">📁</div>
                                        <p>No images in local cache</p>
                                        <p style={{ fontSize: '0.9rem', marginTop: 'var(--spacing-sm)' }}>
                                            Generate some images to see them here
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Lightbox */}
            {lightboxIndex >= 0 && lightboxImages.length > 0 && (
                <ImageLightbox
                    images={lightboxImages}
                    currentIndex={lightboxIndex}
                    onClose={closeLightbox}
                    onNavigate={setLightboxIndex}
                />
            )}
        </>
    );
}
