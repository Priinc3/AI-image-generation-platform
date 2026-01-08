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
                    <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '8px' }}>
                            🎨 Image Editor
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Upload up to 3 reference images and create AI-generated variations
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 'var(--spacing-xl)',
                    }}>
                        {/* Left: Form */}
                        <div style={{
                            background: 'var(--bg-card)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border-color)',
                            padding: 'var(--spacing-xl)',
                        }}>
                            {/* Reference Images */}
                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px' }}>
                                    📷 Reference Images * <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>({referenceImages.length}/{MAX_IMAGES})</span>
                                </label>

                                <div style={{
                                    display: 'flex',
                                    gap: '12px',
                                    flexWrap: 'wrap',
                                }}>
                                    {referenceImages.map((img, index) => (
                                        <div key={index} style={{
                                            position: 'relative',
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: 'var(--radius-md)',
                                            overflow: 'hidden',
                                            border: '2px solid var(--accent-primary)',
                                        }}>
                                            <img src={img.preview || img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button onClick={() => removeImage(index)} style={{
                                                position: 'absolute', top: '4px', right: '4px',
                                                background: 'rgba(0,0,0,0.7)', color: 'white',
                                                border: 'none', borderRadius: '50%',
                                                width: '22px', height: '22px', cursor: 'pointer',
                                                fontSize: '12px',
                                            }}>✕</button>
                                        </div>
                                    ))}

                                    {referenceImages.length < MAX_IMAGES && (
                                        <div
                                            onClick={() => document.getElementById('file-input').click()}
                                            style={{
                                                width: '100px', height: '100px',
                                                border: '2px dashed var(--border-color)',
                                                borderRadius: 'var(--radius-md)',
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', background: 'var(--bg-secondary)',
                                            }}
                                        >
                                            <span style={{ fontSize: '1.5rem' }}>+</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Add</span>
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
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                                    ✍️ Prompt *
                                </label>
                                <textarea
                                    placeholder="Describe the image you want to create..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    rows={3}
                                    style={{
                                        width: '100%', padding: '12px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        resize: 'vertical', fontSize: '0.95rem',
                                    }}
                                />
                            </div>

                            {/* Style Preset */}
                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                                    🎨 Style
                                </label>
                                <StylePresets
                                    selected={selectedPreset}
                                    onSelect={setSelectedPreset}
                                    customValue={customStyle}
                                    onCustomChange={setCustomStyle}
                                />
                            </div>

                            {/* Advanced Options Toggle */}
                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    style={{
                                        background: 'none', border: 'none',
                                        color: 'var(--accent-primary)', cursor: 'pointer',
                                        fontSize: '0.9rem', padding: 0,
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                    }}
                                >
                                    <span style={{ transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                                    Advanced Options
                                </button>

                                {showAdvanced && (
                                    <div style={{
                                        marginTop: '12px', padding: '16px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-md)',
                                    }}>
                                        {/* Image Size */}
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', fontSize: '0.9rem' }}>
                                                📐 Aspect Ratio
                                            </label>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {IMAGE_SIZES.map(size => (
                                                    <button
                                                        key={size.id}
                                                        type="button"
                                                        onClick={() => setSelectedSize(size.id)}
                                                        style={{
                                                            padding: '8px 16px',
                                                            border: selectedSize === size.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                                            borderRadius: 'var(--radius-sm)',
                                                            background: selectedSize === size.id ? 'var(--accent-primary)' : 'var(--bg-card)',
                                                            color: selectedSize === size.id ? 'white' : 'var(--text-primary)',
                                                            cursor: 'pointer', fontSize: '0.85rem',
                                                        }}
                                                    >
                                                        {size.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Creativity */}
                                        <div>
                                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', fontSize: '0.9rem' }}>
                                                🎭 Creativity: {creativity}%
                                            </label>
                                            <input
                                                type="range" min="10" max="100" step="5"
                                                value={creativity}
                                                onChange={(e) => setCreativity(parseInt(e.target.value))}
                                                style={{ width: '100%' }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                <span>Faithful</span>
                                                <span>Creative</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div style={{
                                    background: '#FEE2E2', color: '#DC2626',
                                    padding: '12px', borderRadius: 'var(--radius-md)',
                                    marginBottom: '16px', fontSize: '0.9rem',
                                }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            <button
                                onClick={() => handleGenerate()}
                                disabled={isGenerating || referenceImages.length === 0}
                                style={{
                                    width: '100%', padding: '14px',
                                    background: referenceImages.length === 0 ? 'var(--text-muted)' : 'var(--accent-primary)',
                                    color: 'white', border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '1rem', fontWeight: '600',
                                    cursor: referenceImages.length === 0 ? 'not-allowed' : 'pointer',
                                    opacity: isGenerating ? 0.7 : 1,
                                }}
                            >
                                {isGenerating ? '⏳ Generating...' : `✨ Generate (${referenceImages.length} image${referenceImages.length !== 1 ? 's' : ''})`}
                            </button>
                        </div>

                        {/* Right: Results */}
                        <div style={{
                            background: 'var(--bg-card)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border-color)',
                            padding: 'var(--spacing-xl)',
                            minHeight: '400px',
                        }}>
                            <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>Generated Images</h3>

                            {isGenerating ? (
                                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                    <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                                    <p>Generating your images...</p>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>This may take 30-60 seconds</p>
                                </div>
                            ) : generatedImages.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {generatedImages.map((img, index) => (
                                        <div key={img.key || index} style={{
                                            borderRadius: 'var(--radius-md)',
                                            overflow: 'hidden',
                                            border: '1px solid var(--border-color)',
                                        }}>
                                            <img
                                                src={img.url}
                                                alt=""
                                                onClick={() => setLightboxIndex(index)}
                                                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', cursor: 'pointer' }}
                                            />
                                            <div style={{ padding: '8px', display: 'flex', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => downloadImage(img, img.name || `image_${index + 1}.png`)}
                                                    style={{
                                                        padding: '6px 16px', fontSize: '0.85rem',
                                                        background: 'var(--accent-primary)', color: 'white',
                                                        border: 'none', borderRadius: 'var(--radius-sm)',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    ↓ Download
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🖼️</div>
                                    <p>Your generated images will appear here</p>
                                </div>
                            )}

                            {generatedImages.length > 0 && (
                                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                                    <button
                                        onClick={() => handleGenerate(true)}
                                        disabled={isGenerating}
                                        style={{
                                            padding: '10px 20px', background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                        }}
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
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner"></div></div>}>
            <ImageEditorContent />
        </Suspense>
    );
}
