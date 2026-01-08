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
    { id: '1:1', label: '1:1', width: 1024, height: 1024 },
    { id: '4:3', label: '4:3', width: 1024, height: 768 },
    { id: '3:4', label: '3:4', width: 768, height: 1024 },
    { id: '16:9', label: '16:9', width: 1024, height: 576 },
    { id: '9:16', label: '9:16', width: 576, height: 1024 },
];

const MAX_IMAGES = 3;

function ImageEditorContent() {
    const searchParams = useSearchParams();

    const [referenceImages, setReferenceImages] = useState([]);
    const [prompt, setPrompt] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('ecommerce');
    const [customStyle, setCustomStyle] = useState('');
    const [selectedSize, setSelectedSize] = useState('1:1');
    const [creativity, setCreativity] = useState(70);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [error, setError] = useState('');
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [lastRequest, setLastRequest] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [progress, setProgress] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Progress bar animation during generation
    useEffect(() => {
        let progressInterval;
        let timeInterval;

        if (isGenerating) {
            setProgress(0);
            setElapsedTime(0);

            // Animate progress over 90 seconds, but slow down as it approaches 95%
            progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 95) return 95; // Cap at 95% until actually complete
                    // Slow down as we approach the end
                    const remaining = 95 - prev;
                    const increment = Math.max(0.3, remaining / 30);
                    return Math.min(95, prev + increment);
                });
            }, 1000);

            // Track elapsed time
            timeInterval = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            // Complete the progress bar when done
            if (progress > 0 && progress < 100) {
                setProgress(100);
                setTimeout(() => setProgress(0), 500);
            }
        }

        return () => {
            clearInterval(progressInterval);
            clearInterval(timeInterval);
        };
    }, [isGenerating]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };


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

    const getPresetInfo = () => STYLE_PRESETS.find(p => p.id === selectedPreset) || STYLE_PRESETS[0];
    const getStyleSuffix = () => selectedPreset === 'custom' ? customStyle : getPresetInfo().promptSuffix;
    const getSizeInfo = () => IMAGE_SIZES.find(s => s.id === selectedSize) || IMAGE_SIZES[0];

    const fetchFromS3 = async () => {
        const awsSettings = getAWSSettings();
        if (!awsSettings.accessKeyId || !awsSettings.secretAccessKey) {
            throw new Error('AWS credentials not configured. Go to Settings.');
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
        if (!data.success) throw new Error(data.error || 'Failed to fetch from S3');
        return data.images || [];
    };

    const handleGenerate = async (isRetry = false) => {
        if (referenceImages.length === 0 && !isRetry) {
            setError('Please upload at least 1 reference image');
            return;
        }
        if (!prompt.trim() && !isRetry) {
            setError('Please enter a prompt');
            return;
        }

        setIsGenerating(true);
        setError('');
        setGeneratedImages([]);

        try {
            const settings = getWebhookSettings();
            const webhookUrl = settings.singleWebhookUrl;
            if (!webhookUrl) throw new Error('Webhook URL not configured. Go to Settings.');

            const imagesBefore = await fetchFromS3();
            const existingKeys = new Set(imagesBefore.map(img => img.key));

            const formData = new FormData();
            const requestData = isRetry && lastRequest ? lastRequest : {
                prompt: prompt.trim(),
                stylePreset: selectedPreset,
                stylePromptSuffix: getStyleSuffix(),
                size: getSizeInfo(),
                creativity: creativity / 100,
            };
            if (!isRetry) setLastRequest(requestData);

            formData.append('prompt', requestData.prompt);
            formData.append('stylePreset', requestData.stylePreset);
            formData.append('stylePromptSuffix', requestData.stylePromptSuffix);
            formData.append('width', requestData.size.width.toString());
            formData.append('height', requestData.size.height.toString());
            formData.append('creativity', requestData.creativity.toString());
            formData.append('variations', '2');
            formData.append('webhookUrl', webhookUrl);
            formData.append('imageCount', referenceImages.length.toString());

            for (let i = 0; i < referenceImages.length; i++) {
                const img = referenceImages[i];
                if (img.file) formData.append(`image${i + 1}`, img.file);
                else if (img.url) formData.append(`imageUrl${i + 1}`, img.url);
            }

            const response = await fetch('/api/trigger-single', { method: 'POST', body: formData });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate image');
            }

            const imagesAfter = await fetchFromS3();
            const newImages = imagesAfter.filter(img => !existingKeys.has(img.key));
            setGeneratedImages(newImages.length > 0 ? newImages : imagesAfter.slice(0, 2));
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <Navbar />
            <main className="page-wrapper">
                <div className="container" style={{ maxWidth: '1100px' }}>
                    {/* Header with animation */}
                    <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                        <h1 style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            marginBottom: '8px',
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>
                            Image Editor
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                            Upload reference images and create AI-powered variations
                        </p>
                    </div>

                    <div className="generator-grid">
                        {/* Left: Form */}
                        <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
                            {/* Reference Images */}
                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <label className="form-label">
                                    📷 Reference Images
                                    <span style={{
                                        fontWeight: '400',
                                        color: 'var(--text-muted)',
                                        marginLeft: '8px',
                                        fontSize: '0.85rem'
                                    }}>
                                        ({referenceImages.length}/{MAX_IMAGES})
                                    </span>
                                </label>

                                <div style={{
                                    display: 'flex',
                                    gap: '12px',
                                    flexWrap: 'wrap',
                                }}>
                                    {referenceImages.map((img, index) => (
                                        <div key={index} className="animate-fade-in" style={{
                                            position: 'relative',
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: 'var(--radius-md)',
                                            overflow: 'hidden',
                                            border: '2px solid var(--accent-primary)',
                                            boxShadow: 'var(--shadow-md)',
                                            transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                                        }}>
                                            <img src={img.preview || img.url} alt="" style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                transition: 'transform var(--transition-normal)',
                                            }} />
                                            <button onClick={() => removeImage(index)} style={{
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
                                                fontSize: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all var(--transition-fast)',
                                            }}
                                                onMouseOver={(e) => e.target.style.background = 'var(--error)'}
                                                onMouseOut={(e) => e.target.style.background = 'rgba(0,0,0,0.7)'}
                                            >✕</button>
                                        </div>
                                    ))}

                                    {referenceImages.length < MAX_IMAGES && (
                                        <div
                                            onClick={() => document.getElementById('file-input').click()}
                                            style={{
                                                width: '100px',
                                                height: '100px',
                                                border: '2px dashed var(--border-color)',
                                                borderRadius: 'var(--radius-md)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                background: 'var(--bg-secondary)',
                                                transition: 'all var(--transition-fast)',
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                                e.currentTarget.style.background = 'var(--accent-light)';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                                e.currentTarget.style.background = 'var(--bg-secondary)';
                                            }}
                                        >
                                            <span style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}>+</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Add Image</span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    id="file-input" type="file" accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = () => handleImageSelect(file, reader.result);
                                            reader.readAsDataURL(file);
                                        }
                                        e.target.value = '';
                                    }}
                                />
                            </div>

                            {/* Prompt */}
                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <label className="form-label">✍️ Prompt</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Describe the image you want to create..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            {/* Aspect Ratio - OUTSIDE Advanced Options */}
                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <label className="form-label">📐 Aspect Ratio</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {IMAGE_SIZES.map(size => (
                                        <button
                                            key={size.id}
                                            type="button"
                                            onClick={() => setSelectedSize(size.id)}
                                            className={`size-btn ${selectedSize === size.id ? 'active' : ''}`}
                                        >
                                            {size.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Style Preset */}
                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <label className="form-label">🎨 Style</label>
                                <StylePresets
                                    selected={selectedPreset}
                                    onSelect={setSelectedPreset}
                                    customStyle={customStyle}
                                    onCustomStyleChange={setCustomStyle}
                                />
                            </div>

                            {/* Advanced Options Toggle */}
                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--accent-primary)',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontWeight: '500',
                                    }}
                                >
                                    <span style={{
                                        transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.3s ease',
                                        display: 'inline-block',
                                    }}>▶</span>
                                    Advanced Options
                                </button>

                                <div style={{
                                    maxHeight: showAdvanced ? '200px' : '0',
                                    overflow: 'hidden',
                                    transition: 'max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease',
                                    opacity: showAdvanced ? 1 : 0,
                                    marginTop: showAdvanced ? '12px' : '0',
                                }}>
                                    <div style={{
                                        padding: '16px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                    }}>
                                        {/* Creativity */}
                                        <div>
                                            <label style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontWeight: '500',
                                                marginBottom: '12px',
                                                fontSize: '0.9rem',
                                                color: 'var(--text-primary)',
                                            }}>
                                                <span>🎭 Creativity</span>
                                                <span style={{
                                                    color: 'var(--accent-primary)',
                                                    fontWeight: '600',
                                                }}>{creativity}%</span>
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
                                            <div className="slider-labels">
                                                <span>Faithful</span>
                                                <span>Creative</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="error-message animate-fade-in">
                                    ⚠️ {error}
                                </div>
                            )}

                            <button
                                onClick={() => handleGenerate()}
                                disabled={isGenerating || referenceImages.length === 0}
                                className="btn btn-primary btn-lg"
                                style={{
                                    width: '100%',
                                    opacity: isGenerating ? 0.7 : 1,
                                    cursor: referenceImages.length === 0 ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {isGenerating ? (
                                    <>
                                        <span className="spinner"></span>
                                        Generating...
                                    </>
                                ) : (
                                    `✨ Generate (${referenceImages.length} image${referenceImages.length !== 1 ? 's' : ''})`
                                )}
                            </button>
                        </div>

                        {/* Right: Results */}
                        <div className="card animate-fade-in" style={{ animationDelay: '0.2s', minHeight: '400px' }}>
                            <h3 style={{
                                marginBottom: '16px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                <span>🖼️</span>
                                Generated Images
                            </h3>

                            {isGenerating ? (
                                <div style={{
                                    padding: '40px 24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '300px',
                                }}>
                                    {/* Progress Circle */}
                                    <div style={{
                                        position: 'relative',
                                        width: '120px',
                                        height: '120px',
                                        marginBottom: '24px',
                                    }}>
                                        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                                            {/* Background circle */}
                                            <circle
                                                cx="60"
                                                cy="60"
                                                r="52"
                                                fill="none"
                                                stroke="var(--border-color)"
                                                strokeWidth="8"
                                            />
                                            {/* Progress circle */}
                                            <circle
                                                cx="60"
                                                cy="60"
                                                r="52"
                                                fill="none"
                                                stroke="var(--accent-primary)"
                                                strokeWidth="8"
                                                strokeLinecap="round"
                                                strokeDasharray={`${2 * Math.PI * 52}`}
                                                strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
                                                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                                            />
                                        </svg>
                                        {/* Percentage text */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            textAlign: 'center',
                                        }}>
                                            <div style={{
                                                fontSize: '1.75rem',
                                                fontWeight: '700',
                                                color: 'var(--accent-primary)',
                                            }}>
                                                {Math.round(progress)}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div style={{
                                        width: '100%',
                                        maxWidth: '280px',
                                        marginBottom: '16px',
                                    }}>
                                        <div style={{
                                            width: '100%',
                                            height: '6px',
                                            background: 'var(--border-color)',
                                            borderRadius: 'var(--radius-full)',
                                            overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                width: `${progress}%`,
                                                height: '100%',
                                                background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                                                borderRadius: 'var(--radius-full)',
                                                transition: 'width 0.5s ease',
                                            }} />
                                        </div>
                                    </div>

                                    <p style={{
                                        fontWeight: '600',
                                        marginBottom: '4px',
                                        fontSize: '1rem',
                                    }}>
                                        ✨ Generating your images...
                                    </p>
                                    <p style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--text-muted)',
                                        marginBottom: '8px',
                                    }}>
                                        Time elapsed: {formatTime(elapsedTime)}
                                    </p>
                                    <p style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-muted)',
                                        opacity: 0.7,
                                    }}>
                                        Usually takes 30-90 seconds
                                    </p>
                                </div>

                            ) : generatedImages.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {generatedImages.map((img, index) => (
                                        <div key={img.key || index} className="gallery-item animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                                            <img
                                                src={img.url}
                                                alt=""
                                                onClick={() => setLightboxIndex(index)}
                                                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', cursor: 'pointer' }}
                                            />
                                            <div className="gallery-overlay">
                                                <span className="gallery-label">Image {index + 1}</span>
                                                <button
                                                    onClick={() => downloadImage(img, img.name || `image_${index + 1}.png`)}
                                                    className="gallery-download"
                                                >
                                                    ↓
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '60px 20px',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '300px',
                                }}>
                                    <div style={{
                                        fontSize: '4rem',
                                        marginBottom: '16px',
                                        opacity: '0.5',
                                    }}>🖼️</div>
                                    <p style={{ fontSize: '1rem' }}>Your generated images will appear here</p>
                                    <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>Upload images and click Generate to start</p>
                                </div>
                            )}

                            {generatedImages.length > 0 && (
                                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                                    <button
                                        onClick={() => handleGenerate(true)}
                                        disabled={isGenerating}
                                        className="btn btn-secondary"
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
                    onClose={() => setLightboxIndex(-1)}
                    onNavigate={setLightboxIndex}
                />
            )}
        </>
    );
}

export default function ImageEditorPage() {
    return (
        <Suspense fallback={
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'var(--bg-secondary)',
            }}>
                <div className="preview-spinner"></div>
            </div>
        }>
            <ImageEditorContent />
        </Suspense>
    );
}
