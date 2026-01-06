'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ImageUploader from '@/components/ImageUploader';
import ImageLightbox from '@/components/ImageLightbox';
import StylePresets, { STYLE_PRESETS } from '@/components/StylePresets';
import { downloadImage } from '@/utils/downloadZip';
import { saveToGallery } from '@/utils/galleryStorage';
import { getWebhookSettings, getAWSSettings } from '@/utils/settingsStorage';

// Image size presets
const IMAGE_SIZES = [
    { id: '1:1', label: '1:1 Square', width: 1024, height: 1024 },
    { id: '4:3', label: '4:3 Landscape', width: 1024, height: 768 },
    { id: '3:4', label: '3:4 Portrait', width: 768, height: 1024 },
    { id: '16:9', label: '16:9 Wide', width: 1024, height: 576 },
    { id: '9:16', label: '9:16 Tall', width: 576, height: 1024 },
    { id: 'custom', label: 'Custom', width: 1024, height: 1024 },
];

export default function SingleImagePage() {
    const searchParams = useSearchParams();
    const [referenceImage, setReferenceImage] = useState(null);
    const [referencePreview, setReferencePreview] = useState(null);
    const [editImageUrl, setEditImageUrl] = useState(null);
    const [prompt, setPrompt] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('ecommerce');
    const [customStyle, setCustomStyle] = useState('');
    const [selectedSize, setSelectedSize] = useState('1:1');
    const [customWidth, setCustomWidth] = useState(1024);
    const [customHeight, setCustomHeight] = useState(1024);
    const [creativity, setCreativity] = useState(70);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [error, setError] = useState('');
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [lastRequest, setLastRequest] = useState(null);

    // Check for edit mode - load image from localStorage
    useEffect(() => {
        const isEdit = searchParams.get('edit') === 'true';
        if (isEdit) {
            const savedUrl = localStorage.getItem('editImageUrl');
            const savedName = localStorage.getItem('editImageName');
            if (savedUrl) {
                setEditImageUrl(savedUrl);
                setReferencePreview(savedUrl);
                setPrompt(`Edit image: ${savedName || 'image'}`);
                // Clear the localStorage after reading
                localStorage.removeItem('editImageUrl');
                localStorage.removeItem('editImageName');
            }
        }
    }, [searchParams]);

    const handleImageSelect = useCallback((file, preview) => {
        setReferenceImage(file);
        setReferencePreview(preview);
        setEditImageUrl(null); // Clear edit image when new file selected
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
                maxKeys: 50,
            }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch from S3');
        }

        return data.images || [];
    };

    const handleGenerate = async (isRetry = false) => {
        if (!prompt.trim() && !isRetry) {
            setError('Please enter a prompt describing the image you want');
            return;
        }

        setIsGenerating(true);
        setError('');
        setGeneratedImages([]);

        try {
            const settings = getWebhookSettings();
            const webhookUrl = settings.singleWebhookUrl;

            if (!webhookUrl) {
                throw new Error('Webhook URL not configured. Please go to Settings and add your n8n webhook URL.');
            }

            // Get images from S3 BEFORE generation to know what's new
            const imagesBefore = await fetchFromS3();
            const existingKeys = new Set(imagesBefore.map(img => img.key));
            console.log('Images in S3 before generation:', existingKeys.size);

            const formData = new FormData();

            const requestData = isRetry && lastRequest ? lastRequest : {
                prompt: prompt.trim(),
                stylePreset: selectedPreset,
                styleName: selectedPreset === 'custom' ? 'Custom' : getPresetInfo().name,
                stylePromptSuffix: getStyleSuffix(),
                size: getSizeInfo(),
                creativity: creativity / 100,
            };

            if (!isRetry) {
                setLastRequest(requestData);
            }

            formData.append('prompt', requestData.prompt);
            formData.append('stylePreset', requestData.stylePreset);
            formData.append('stylePromptSuffix', requestData.stylePromptSuffix);
            formData.append('width', requestData.size.width.toString());
            formData.append('height', requestData.size.height.toString());
            formData.append('creativity', requestData.creativity.toString());
            formData.append('variations', '2');
            formData.append('webhookUrl', webhookUrl);

            // Handle image - either uploaded file or URL from edit mode
            if (referenceImage) {
                formData.append('image', referenceImage);
            } else if (editImageUrl) {
                // Pass the S3 URL for n8n to use as reference
                formData.append('imageUrl', editImageUrl);
            }

            // Trigger n8n workflow - it uploads to S3
            const response = await fetch('/api/trigger-single', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate image');
            }

            // n8n has completed - now get images from S3 AFTER generation
            // (same method as Gallery!)
            console.log('n8n completed. Fetching new images from S3...');

            const imagesAfter = await fetchFromS3();
            console.log('Images in S3 after generation:', imagesAfter.length);

            // Find NEW images (ones that weren't there before)
            const newImages = imagesAfter.filter(img => !existingKeys.has(img.key));
            console.log('New images found:', newImages.length);

            if (newImages.length > 0) {
                // Sort by date (newest first) and take the first 2
                newImages.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
                const latestImages = newImages.slice(0, 2);

                setGeneratedImages(latestImages);

                saveToGallery({
                    type: 'single',
                    productName: requestData.prompt.substring(0, 50),
                    images: latestImages,
                    prompt: requestData.prompt,
                    style: requestData.styleName,
                });
            } else {
                // No new images found - maybe n8n didn't upload or there was an issue
                // Try getting the 2 most recent images anyway
                const mostRecent = imagesAfter.slice(0, 2);
                if (mostRecent.length > 0) {
                    setGeneratedImages(mostRecent);
                    console.log('Using most recent images from S3');
                } else {
                    throw new Error('No images found in S3 bucket. Make sure n8n is uploading to S3.');
                }
            }
        } catch (err) {
            console.error('Generation error:', err);
            setError(err.message || 'An error occurred during generation');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRetry = () => {
        if (lastRequest) {
            handleGenerate(true);
        }
    };

    const handleDownload = (img, index) => {
        const filename = img.name || img.key || `generated_image_${index + 1}.png`;
        downloadImage(img, filename);
    };

    const openLightbox = (index) => {
        setLightboxIndex(index);
    };

    const closeLightbox = () => {
        setLightboxIndex(-1);
    };

    return (
        <>
            <Navbar />
            <main className="page-wrapper">
                <div className="container">
                    <div className="generator-page">
                        <div className="section-header">
                            <h1 className="section-title">Single Image Generator</h1>
                            <p className="section-subtitle">
                                Create 2 stunning AI-generated image variations with customizable styles
                            </p>
                        </div>

                        <div className="generator-grid">
                            <div className="generator-form">
                                {/* Reference Image - show preview if editing or uploaded */}
                                <div className="form-group">
                                    <label className="form-label">📷 Reference Image {editImageUrl ? '(Editing)' : '(Optional)'}</label>
                                    {(referencePreview || editImageUrl) ? (
                                        <div className="upload-preview" style={{
                                            position: 'relative',
                                            borderRadius: 'var(--radius-md)',
                                            overflow: 'hidden',
                                            border: '1px solid var(--border-color)',
                                        }}>
                                            <img
                                                src={referencePreview || editImageUrl}
                                                alt="Reference"
                                                style={{
                                                    width: '100%',
                                                    maxHeight: '200px',
                                                    objectFit: 'contain',
                                                    background: 'var(--bg-secondary)'
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReferenceImage(null);
                                                    setReferencePreview(null);
                                                    setEditImageUrl(null);
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '8px',
                                                    right: '8px',
                                                    background: 'rgba(0,0,0,0.6)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: 'var(--radius-sm)',
                                                    padding: '4px 12px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem',
                                                }}
                                            >
                                                ✕ Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <ImageUploader onImageSelect={handleImageSelect} />
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">✍️ Image Prompt *</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Describe the image you want to create..."
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">🎨 Style Preset</label>
                                    <StylePresets
                                        selected={selectedPreset}
                                        onSelect={setSelectedPreset}
                                        customStyle={customStyle}
                                        onCustomStyleChange={setCustomStyle}
                                    />
                                </div>

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
                                    onClick={() => handleGenerate(false)}
                                    disabled={isGenerating}
                                    style={{ width: '100%' }}
                                >
                                    {isGenerating ? (
                                        <>
                                            <span className="spinner"></span>
                                            Generating...
                                        </>
                                    ) : (
                                        '✨ Generate 2 Image Variants'
                                    )}
                                </button>

                                {lastRequest && !isGenerating && generatedImages.length === 0 && (
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleRetry}
                                        style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
                                    >
                                        🔄 Retry
                                    </button>
                                )}
                            </div>

                            <div className="generator-preview">
                                {isGenerating ? (
                                    <div className="preview-placeholder">
                                        <div className="preview-spinner"></div>
                                        <p>Generating images...</p>
                                    </div>
                                ) : generatedImages.length > 0 ? (
                                    <div className="results-container">
                                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>
                                            ✅ Generated Images ({generatedImages.length})
                                        </h3>
                                        <div className="gallery" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                            {generatedImages.map((img, index) => (
                                                <div key={index} className="gallery-item">
                                                    <img
                                                        src={img.url}
                                                        alt={`Generated ${index + 1}`}
                                                        onClick={() => openLightbox(index)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <div className="gallery-overlay">
                                                        <span className="gallery-label">Variant {index + 1}</span>
                                                        <button
                                                            className="gallery-download"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownload(img, index);
                                                            }}
                                                        >
                                                            ↓
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
                                            {generatedImages.map((img, index) => (
                                                <button
                                                    key={index}
                                                    className="btn btn-primary"
                                                    onClick={() => handleDownload(img, index)}
                                                    style={{ flex: 1 }}
                                                >
                                                    ↓ Download {index + 1}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            className="btn btn-secondary"
                                            onClick={handleRetry}
                                            style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
                                        >
                                            🔄 Regenerate
                                        </button>
                                    </div>
                                ) : (
                                    <div className="preview-placeholder">
                                        <div className="preview-icon">🖼️</div>
                                        <p>Your generated images will appear here</p>
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
