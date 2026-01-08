'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ImageLightbox from '@/components/ImageLightbox';
import StylePresets, { STYLE_PRESETS } from '@/components/StylePresets';
import { downloadImage } from '@/utils/downloadZip';
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

const MAX_IMAGES = 3;

// Inner component that uses useSearchParams
function ImageEditorContent() {
    const searchParams = useSearchParams();

    // Multiple reference images (up to 3)
    const [referenceImages, setReferenceImages] = useState([]); // Array of { file, preview, url? }

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
        const isEdit = searchParams?.get('edit') === 'true';
        if (isEdit) {
            const savedUrl = localStorage.getItem('editImageUrl');
            const savedName = localStorage.getItem('editImageName');
            if (savedUrl) {
                setReferenceImages([{ url: savedUrl, preview: savedUrl, name: savedName || 'image' }]);
                setPrompt(`Edit image: ${savedName || 'image'}`);
                localStorage.removeItem('editImageUrl');
                localStorage.removeItem('editImageName');
            }
        }
    }, [searchParams]);

    const handleImageSelect = useCallback((file, preview) => {
        if (referenceImages.length >= MAX_IMAGES) {
            setError(`Maximum ${MAX_IMAGES} images allowed`);
            return;
        }
        setReferenceImages(prev => [...prev, { file, preview }]);
        setError('');
    }, [referenceImages.length]);

    const removeImage = (index) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
    };

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
        // Validate: at least 1 reference image required
        if (referenceImages.length === 0 && !isRetry) {
            setError('Please upload at least 1 reference image');
            return;
        }

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

            // Add image count
            formData.append('imageCount', referenceImages.length.toString());

            // Add all reference images
            for (let i = 0; i < referenceImages.length; i++) {
                const img = referenceImages[i];
                if (img.file) {
                    formData.append(`image${i + 1}`, img.file);
                } else if (img.url) {
                    formData.append(`imageUrl${i + 1}`, img.url);
                }
            }

            const response = await fetch('/api/trigger-single', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate image');
            }

            console.log('n8n completed. Fetching new images from S3...');

            const imagesAfter = await fetchFromS3();
            console.log('Images in S3 after generation:', imagesAfter.length);

            const newImages = imagesAfter.filter(img => !existingKeys.has(img.key));
            console.log('New images found:', newImages.length);

            if (newImages.length > 0) {
                setGeneratedImages(newImages);
            } else {
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
                    <div className="section-header">
                        <h1 className="section-title">🎨 Image Editor</h1>
                        <p className="section-subtitle">
                            Upload up to 3 reference images and create AI-generated variations
                        </p>
                    </div>

                    <div className="generator-grid">
                        <div className="generator-form">
                            {/* Reference Images Section */}
                            <div className="form-group">
                                <label className="form-label">
                                    📷 Reference Images * ({referenceImages.length}/{MAX_IMAGES})
                                </label>

                                {/* Image Previews */}
                                {referenceImages.length > 0 && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                        gap: 'var(--spacing-sm)',
                                        marginBottom: 'var(--spacing-md)',
                                    }}>
                                        {referenceImages.map((img, index) => (
                                            <div key={index} style={{
                                                position: 'relative',
                                                borderRadius: 'var(--radius-md)',
                                                overflow: 'hidden',
                                                border: '1px solid var(--border-color)',
                                                aspectRatio: '1',
                                            }}>
                                                <img
                                                    src={img.preview || img.url}
                                                    alt={`Reference ${index + 1}`}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '4px',
                                                        right: '4px',
                                                        background: 'rgba(0,0,0,0.7)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        width: '24px',
                                                        height: '24px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.75rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '4px',
                                                    left: '4px',
                                                    background: 'rgba(0,0,0,0.7)',
                                                    color: 'white',
                                                    borderRadius: 'var(--radius-sm)',
                                                    padding: '2px 6px',
                                                    fontSize: '0.7rem',
                                                }}>
                                                    #{index + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Image Button */}
                                {referenceImages.length < MAX_IMAGES && (
                                    <div
                                        style={{
                                            border: '2px dashed var(--border-color)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: 'var(--spacing-lg)',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            background: 'var(--bg-secondary)',
                                            transition: 'all 0.2s',
                                        }}
                                        onClick={() => document.getElementById('file-input').click()}
                                    >
                                        <input
                                            id="file-input"
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = () => {
                                                        handleImageSelect(file, reader.result);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                                e.target.value = '';
                                            }}
                                        />
                                        <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📤</div>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            {referenceImages.length === 0
                                                ? 'Click to upload reference image (required)'
                                                : `Add more images (${MAX_IMAGES - referenceImages.length} remaining)`}
                                        </p>
                                    </div>
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
                                    customValue={customStyle}
                                    onCustomChange={setCustomStyle}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">📐 Image Size</label>
                                <div className="size-selector">
                                    {IMAGE_SIZES.map(size => (
                                        <button
                                            key={size.id}
                                            type="button"
                                            className={`size-option ${selectedSize === size.id ? 'active' : ''}`}
                                            onClick={() => setSelectedSize(size.id)}
                                        >
                                            {size.label}
                                        </button>
                                    ))}
                                </div>
                                {selectedSize === 'custom' && (
                                    <div className="custom-size-inputs" style={{ marginTop: 'var(--spacing-sm)' }}>
                                        <input
                                            type="number"
                                            placeholder="Width"
                                            value={customWidth}
                                            onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1024)}
                                            min={256}
                                            max={2048}
                                        />
                                        <span>×</span>
                                        <input
                                            type="number"
                                            placeholder="Height"
                                            value={customHeight}
                                            onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1024)}
                                            min={256}
                                            max={2048}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    🎭 Creativity: {creativity}%
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    step="5"
                                    value={creativity}
                                    onChange={(e) => setCreativity(parseInt(e.target.value))}
                                    className="creativity-slider"
                                />
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                }}>
                                    <span>More Faithful</span>
                                    <span>More Creative</span>
                                </div>
                            </div>

                            {error && (
                                <div className="error-message" style={{
                                    background: 'var(--error-bg)',
                                    color: 'var(--error)',
                                    padding: 'var(--spacing-md)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: 'var(--spacing-md)',
                                }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            <button
                                className="btn btn-primary btn-lg"
                                onClick={() => handleGenerate()}
                                disabled={isGenerating || referenceImages.length === 0}
                                style={{ width: '100%' }}
                            >
                                {isGenerating ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        Generating...
                                    </>
                                ) : (
                                    `✨ Generate with ${referenceImages.length} Image${referenceImages.length !== 1 ? 's' : ''}`
                                )}
                            </button>
                        </div>

                        {/* Results Section */}
                        <div className="generator-results">
                            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Generated Images</h3>

                            {isGenerating ? (
                                <div className="results-loading">
                                    <div className="spinner"></div>
                                    <p>Generating your images...</p>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        This may take 30-60 seconds
                                    </p>
                                </div>
                            ) : generatedImages.length > 0 ? (
                                <div className="results-grid">
                                    {generatedImages.map((img, index) => (
                                        <div key={img.key || index} className="result-card">
                                            <div
                                                className="result-image"
                                                onClick={() => openLightbox(index)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <img src={img.url} alt={`Generated ${index + 1}`} />
                                            </div>
                                            <div className="result-actions">
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handleDownload(img, index)}
                                                >
                                                    ↓ Download
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="results-empty">
                                    <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>🖼️</div>
                                    <p>Your generated images will appear here</p>
                                </div>
                            )}

                            {generatedImages.length > 0 && (
                                <div style={{ marginTop: 'var(--spacing-lg)', textAlign: 'center' }}>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleRetry}
                                        disabled={isGenerating}
                                    >
                                        🔄 Generate Again
                                    </button>
                                </div>
                            )}
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

// Wrapper component with Suspense for useSearchParams
export default function ImageEditorPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div className="spinner"></div>
            </div>
        }>
            <ImageEditorContent />
        </Suspense>
    );
}
