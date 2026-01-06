'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ImageLightbox from '@/components/ImageLightbox';
import { downloadImagesAsZip, downloadImage } from '@/utils/downloadZip';
import { getAWSSettings } from '@/utils/settingsStorage';

export default function GalleryPage() {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lightboxImages, setLightboxImages] = useState([]);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [selectedImages, setSelectedImages] = useState(new Set());

    useEffect(() => {
        loadGallery();
    }, []);

    const loadGallery = async () => {
        setLoading(true);
        setError('');

        try {
            const awsSettings = getAWSSettings();

            if (!awsSettings.accessKeyId || !awsSettings.secretAccessKey) {
                setError('AWS credentials not configured. Go to Settings to add them.');
                setLoading(false);
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
                    maxKeys: 200,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setImages(data.images || []);
            } else {
                setError(data.error || 'Failed to load images');
            }
        } catch (err) {
            console.error('Load error:', err);
            setError('Failed to connect to S3');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (img) => {
        downloadImage(img, img.name || 'image.png');
    };

    const handleDownloadSelected = () => {
        if (selectedImages.size === 0) return;
        const imagesToDownload = images.filter((_, idx) => selectedImages.has(idx));
        downloadImagesAsZip(imagesToDownload, 'selected-images');
    };

    const handleDownloadAll = () => {
        if (images.length === 0) return;
        downloadImagesAsZip(images, 'all-images');
    };

    const toggleSelect = (index) => {
        const newSelected = new Set(selectedImages);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedImages(newSelected);
    };

    const selectAll = () => {
        if (selectedImages.size === images.length) {
            setSelectedImages(new Set());
        } else {
            setSelectedImages(new Set(images.map((_, idx) => idx)));
        }
    };

    const openLightbox = (index) => {
        setLightboxImages(images);
        setLightboxIndex(index);
    };

    const closeLightbox = () => {
        setLightboxIndex(-1);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <>
            <Navbar />
            <main className="page-wrapper">
                <div className="container">
                    <div className="section-header" style={{ marginBottom: 'var(--spacing-xl)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                            <div>
                                <h1 className="section-title">Gallery</h1>
                                <p className="section-subtitle">
                                    {images.length} images in your S3 bucket
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button className="btn btn-secondary" onClick={loadGallery} disabled={loading}>
                                    🔄 Refresh
                                </button>
                                {selectedImages.size > 0 && (
                                    <button className="btn btn-primary" onClick={handleDownloadSelected}>
                                        ↓ Download Selected ({selectedImages.size})
                                    </button>
                                )}
                                {images.length > 0 && (
                                    <button className="btn btn-secondary" onClick={handleDownloadAll}>
                                        ↓ Download All
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 'var(--spacing-3xl)',
                            color: 'var(--text-muted)',
                        }}>
                            <div className="spinner" style={{ marginBottom: 'var(--spacing-md)' }}></div>
                            <p>Loading images from S3...</p>
                        </div>
                    ) : error ? (
                        <div style={{
                            textAlign: 'center',
                            padding: 'var(--spacing-3xl)',
                            background: 'var(--bg-card)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border-color)',
                        }}>
                            <p style={{ color: 'var(--error)', marginBottom: 'var(--spacing-lg)' }}>
                                ⚠️ {error}
                            </p>
                            <a href="/settings" className="btn btn-primary">
                                Go to Settings
                            </a>
                        </div>
                    ) : images.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: 'var(--spacing-3xl)',
                            background: 'var(--bg-card)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border-color)',
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>🖼️</div>
                            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>No images yet</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>
                                Generate some images to see them here
                            </p>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
                                <a href="/amazon-pdp" className="btn btn-primary">📦 Amazon PDP</a>
                                <a href="/single-image" className="btn btn-secondary">🎨 Single Image</a>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Select All */}
                            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedImages.size === images.length}
                                        onChange={selectAll}
                                    />
                                    Select All
                                </label>
                            </div>

                            {/* Image Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: 'var(--spacing-md)',
                            }}>
                                {images.map((img, index) => (
                                    <div
                                        key={img.key || index}
                                        style={{
                                            position: 'relative',
                                            borderRadius: 'var(--radius-md)',
                                            overflow: 'hidden',
                                            border: selectedImages.has(index) ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                            background: 'var(--bg-card)',
                                        }}
                                    >
                                        {/* Selection checkbox */}
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '8px',
                                                left: '8px',
                                                zIndex: 2,
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedImages.has(index)}
                                                onChange={() => toggleSelect(index)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                        </div>

                                        {/* Image */}
                                        <div
                                            style={{
                                                aspectRatio: '1',
                                                cursor: 'pointer',
                                                background: 'var(--bg-secondary)',
                                            }}
                                            onClick={() => openLightbox(index)}
                                        >
                                            <img
                                                src={img.url}
                                                alt={img.name || 'Image'}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                }}
                                                loading="lazy"
                                            />
                                        </div>

                                        {/* Info & Download */}
                                        <div style={{
                                            padding: 'var(--spacing-sm)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}>
                                            <div style={{ overflow: 'hidden' }}>
                                                <p style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-muted)',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}>
                                                    {formatDate(img.lastModified)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownload(img);
                                                }}
                                                style={{
                                                    background: 'var(--accent-primary)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: 'var(--radius-sm)',
                                                    padding: '4px 10px',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                ↓
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>

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
