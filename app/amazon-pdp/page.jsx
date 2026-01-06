'use client';

import { useState, useCallback, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ImageUploader from '@/components/ImageUploader';
import ImageLightbox from '@/components/ImageLightbox';
import StylePresets, { STYLE_PRESETS } from '@/components/StylePresets';
import { downloadImagesAsZip, downloadImage } from '@/utils/downloadZip';
import { saveToGallery } from '@/utils/galleryStorage';
import { getWebhookSettings, getAWSSettings } from '@/utils/settingsStorage';

const IMAGE_TYPES = [
    { id: 'hero', name: '01 - Hero Image', description: 'Main product showcase' },
    { id: 'ingredients', name: '02 - Ingredients', description: 'Key ingredients display' },
    { id: 'benefits', name: '03 - Benefits', description: 'Product benefits overview' },
    { id: 'trust', name: '04 - Trust/Clean Label', description: 'Certifications & claims' },
    { id: 'usage', name: '05 - Usage/Lifestyle', description: 'How to use the product' },
    { id: 'brand', name: '06 - Brand Promise', description: 'Brand story & closing' },
];

const IMAGE_SIZES = [
    { id: '1:1', label: '1:1 Square', width: 1024, height: 1024 },
    { id: '4:3', label: '4:3 Landscape', width: 1024, height: 768 },
    { id: '3:4', label: '3:4 Portrait', width: 768, height: 1024 },
    { id: '16:9', label: '16:9 Wide', width: 1024, height: 576 },
    { id: 'custom', label: 'Custom', width: 1024, height: 1024 },
];

const PROGRESS_STEPS = [
    { id: 'upload', label: 'Preparing Data', status: 'Uploading image and description...' },
    { id: 'extract', label: 'Extracting Product Info', status: 'AI is analyzing your product...' },
    { id: 'generate', label: 'Generating Images', status: 'Creating 6 PDP images...' },
    { id: 'fetch', label: 'Fetching from S3', status: 'Loading generated images...' },
    { id: 'complete', label: 'Complete', status: 'All images ready!' },
];

export default function AmazonPDPPage() {
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [description, setDescription] = useState('');
    const [extraPrompt, setExtraPrompt] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('ecommerce');
    const [customStyle, setCustomStyle] = useState('');
    const [selectedSize, setSelectedSize] = useState('1:1');
    const [customWidth, setCustomWidth] = useState(1024);
    const [customHeight, setCustomHeight] = useState(1024);
    const [creativity, setCreativity] = useState(70);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentStep, setCurrentStep] = useState(-1);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [error, setError] = useState('');
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [startTime, setStartTime] = useState(null);
    const [webhookUrl, setWebhookUrl] = useState('');

    useEffect(() => {
        const settings = getWebhookSettings();
        if (settings.pdpWebhookUrl) {
            setWebhookUrl(settings.pdpWebhookUrl);
        }
    }, []);

    const handleImageSelect = useCallback((file, preview) => {
        setImage(file);
        setImagePreview(preview);
        setError('');
    }, []);

    const getPresetInfo = () => {
        return STYLE_PRESETS.find(p => p.id === selectedPreset) || STYLE_PRESETS[0];
    };

    const getStyleSuffix = () => {
        if (selectedPreset === 'custom') {
            return customStyle;
        }
        return getPresetInfo().promptSuffix;
    };

    const getSizeInfo = () => {
        if (selectedSize === 'custom') {
            return { width: customWidth, height: customHeight };
        }
        return IMAGE_SIZES.find(s => s.id === selectedSize) || IMAGE_SIZES[0];
    };

    // SAME METHOD AS GALLERY - fetch images from S3 with pre-signed URLs
    const fetchFromS3 = async () => {
        const awsSettings = getAWSSettings();

        if (!awsSettings.accessKeyId || !awsSettings.secretAccessKey) {
            throw new Error('AWS credentials not configured. Go to Settings to add them.');
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

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch from S3');
        }

        return data.images || [];
    };

    const handleGenerate = async () => {
        if (!image || !description.trim()) {
            setError('Please upload an image and enter a product description');
            return;
        }

        setIsGenerating(true);
        setError('');
        setGeneratedImages([]);
        setCurrentStep(0);
        setStartTime(Date.now());

        try {
            // Get images from S3 BEFORE generation
            const imagesBefore = await fetchFromS3();
            const existingKeys = new Set(imagesBefore.map(img => img.key));

            const formData = new FormData();
            formData.append('image', image);
            formData.append('description', description);
            formData.append('stylePreset', selectedPreset);
            formData.append('stylePromptSuffix', getStyleSuffix());
            formData.append('width', getSizeInfo().width.toString());
            formData.append('height', getSizeInfo().height.toString());
            formData.append('creativity', (creativity / 100).toString());
            if (extraPrompt.trim()) {
                formData.append('extraPrompt', extraPrompt);
            }
            if (webhookUrl.trim()) {
                formData.append('webhookUrl', webhookUrl);
            }

            setCurrentStep(0);
            await new Promise(resolve => setTimeout(resolve, 300));
            setCurrentStep(1);

            const response = await fetch('/api/trigger-pdp', {
                method: 'POST',
                body: formData,
            });

            setCurrentStep(2);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate images');
            }

            await response.json();
            setCurrentStep(3);

            // Get images from S3 AFTER generation
            const imagesAfter = await fetchFromS3();
            const newImages = imagesAfter.filter(img => !existingKeys.has(img.key));

            setCurrentStep(4);

            if (newImages.length > 0) {
                newImages.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
                const latestImages = newImages.slice(0, 6);
                setGeneratedImages(latestImages);

                saveToGallery({
                    type: 'pdp',
                    productName: description.substring(0, 50),
                    images: latestImages,
                    prompt: description,
                });
            } else {
                const mostRecent = imagesAfter.slice(0, 6);
                if (mostRecent.length > 0) {
                    setGeneratedImages(mostRecent);
                } else {
                    throw new Error('No images found in S3 bucket.');
                }
            }
        } catch (err) {
            console.error('Generation error:', err);
            setError(err.message || 'An error occurred during generation');
            setCurrentStep(-1);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadAll = async () => {
        if (generatedImages.length === 0) return;
        await downloadImagesAsZip(generatedImages, 'amazon-pdp-images');
    };

    const handleDownloadSingle = (img, index) => {
        const filename = img.name || img.key || `pdp_image_${index + 1}.png`;
        downloadImage(img, filename);
    };

    // Open Single Image editor with this image pre-loaded
    const handleEditImage = (img) => {
        // Store the image URL in localStorage for the Single Image page to pick up
        localStorage.setItem('editImageUrl', img.url);
        localStorage.setItem('editImageName', img.name || img.key || 'image');
        // Open Single Image in new tab
        window.open('/single-image?edit=true', '_blank');
    };

    const openLightbox = (index) => {
        setLightboxIndex(index);
    };

    const closeLightbox = () => {
        setLightboxIndex(-1);
    };

    const getElapsedTime = () => {
        if (!startTime) return '';
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    };

    return (
        <>
            <Navbar />
            <main className="page-wrapper">
                <div className="container">
                    <div className="generator-page">
                        <div className="section-header">
                            <h1 className="section-title">Amazon PDP Generator</h1>
                            <p className="section-subtitle">
                                Generate 6 professional product listing images for your Amazon store
                            </p>
                        </div>

                        <div className="generator-grid">
                            <div className="generator-form">
                                <div className="form-group">
                                    <label className="form-label">📷 Product Image *</label>
                                    <ImageUploader onImageSelect={handleImageSelect} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">📝 Product Description *</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Paste your raw product description here..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={5}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">✏️ Extra Instructions (Optional)</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Add any specific styling preferences..."
                                        value={extraPrompt}
                                        onChange={(e) => setExtraPrompt(e.target.value)}
                                        rows={2}
                                    />
                                </div>

                                {/* Style Presets */}
                                <div className="form-group">
                                    <label className="form-label">🎨 Style Preset</label>
                                    <StylePresets
                                        selected={selectedPreset}
                                        onSelect={setSelectedPreset}
                                        customStyle={customStyle}
                                        onCustomStyleChange={setCustomStyle}
                                    />
                                </div>

                                {/* Image Size */}
                                <div className="form-group">
                                    <label className="form-label">📐 Image Size</label>
                                    <div className="size-selector">
                                        {IMAGE_SIZES.map((size) => (
                                            <button
                                                key={size.id}
                                                type="button"
                                                className={`size-btn ${selectedSize === size.id ? 'active' : ''}`}
                                                onClick={() => setSelectedSize(size.id)}
                                            >
                                                {size.label}
                                            </button>
                                        ))}
                                    </div>

                                    {selectedSize === 'custom' && (
                                        <div className="custom-size-inputs">
                                            <div className="size-input-group">
                                                <label>Width</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={customWidth}
                                                    onChange={(e) => setCustomWidth(parseInt(e.target.value) || 512)}
                                                    min={256}
                                                    max={2048}
                                                />
                                            </div>
                                            <span className="size-separator">×</span>
                                            <div className="size-input-group">
                                                <label>Height</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={customHeight}
                                                    onChange={(e) => setCustomHeight(parseInt(e.target.value) || 512)}
                                                    min={256}
                                                    max={2048}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Creativity Slider */}
                                <div className="form-group">
                                    <label className="form-label">🎭 Creativity: {creativity}%</label>
                                    <div className="slider-container">
                                        <input
                                            type="range"
                                            className="creativity-slider"
                                            min="10"
                                            max="100"
                                            step="5"
                                            value={creativity}
                                            onChange={(e) => setCreativity(parseInt(e.target.value))}
                                        />
                                        <div className="slider-labels">
                                            <span>Conservative</span>
                                            <span>Creative</span>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="error-message">⚠️ {error}</div>
                                )}

                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    style={{ width: '100%' }}
                                >
                                    {isGenerating ? (
                                        <>
                                            <span className="spinner"></span>
                                            Generating 6 Images...
                                        </>
                                    ) : (
                                        '✨ Generate 6 PDP Images'
                                    )}
                                </button>

                                {/* Progress Steps */}
                                {isGenerating && currentStep >= 0 && (
                                    <div className="progress-steps" style={{ marginTop: 'var(--spacing-lg)' }}>
                                        {PROGRESS_STEPS.map((step, index) => (
                                            <div
                                                key={step.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--spacing-sm)',
                                                    padding: 'var(--spacing-sm) 0',
                                                    color: index <= currentStep ? 'var(--accent-primary)' : 'var(--text-muted)',
                                                }}
                                            >
                                                <span style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    background: index < currentStep ? 'var(--success)' : index === currentStep ? 'var(--accent-primary)' : 'var(--border-color)',
                                                    color: index <= currentStep ? 'white' : 'var(--text-muted)',
                                                }}>
                                                    {index < currentStep ? '✓' : index + 1}
                                                </span>
                                                <span style={{ fontSize: '0.9rem' }}>{step.label}</span>
                                            </div>
                                        ))}
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 'var(--spacing-sm)' }}>
                                            {getElapsedTime()}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="generator-preview">
                                {isGenerating ? (
                                    <div className="preview-placeholder">
                                        <div className="preview-spinner"></div>
                                        <p>{PROGRESS_STEPS[currentStep]?.status || 'Processing...'}</p>
                                    </div>
                                ) : generatedImages.length > 0 ? (
                                    <div className="results-container">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                            <h3>✅ Generated Images ({generatedImages.length})</h3>
                                            <button className="btn btn-primary" onClick={handleDownloadAll}>
                                                ↓ Download All
                                            </button>
                                        </div>
                                        <div className="gallery" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                            {generatedImages.map((img, index) => (
                                                <div key={index} className="gallery-item">
                                                    <img
                                                        src={img.url}
                                                        alt={IMAGE_TYPES[index]?.name || `Image ${index + 1}`}
                                                        onClick={() => openLightbox(index)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <div className="gallery-overlay">
                                                        <span className="gallery-label">
                                                            {IMAGE_TYPES[index]?.name || `Image ${index + 1}`}
                                                        </span>
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <button
                                                                className="gallery-download"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditImage(img);
                                                                }}
                                                                title="Edit in Single Image"
                                                                style={{ fontSize: '0.8rem' }}
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                className="gallery-download"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownloadSingle(img, index);
                                                                }}
                                                                title="Download"
                                                            >
                                                                ↓
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="preview-placeholder">
                                        <div className="preview-icon">🛒</div>
                                        <p>Your 6 PDP images will appear here</p>
                                        <div style={{ marginTop: 'var(--spacing-lg)', textAlign: 'left' }}>
                                            {IMAGE_TYPES.map((type) => (
                                                <div key={type.id} style={{
                                                    fontSize: '0.85rem',
                                                    color: 'var(--text-muted)',
                                                    padding: 'var(--spacing-xs) 0'
                                                }}>
                                                    {type.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {lightboxIndex >= 0 && generatedImages.length > 0 && (
                <ImageLightbox
                    images={generatedImages}
                    currentIndex={lightboxIndex}
                    onClose={closeLightbox}
                    onNavigate={setLightboxIndex}
                />
            )}
        </>
    );
}
