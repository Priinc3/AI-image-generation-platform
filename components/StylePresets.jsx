'use client';

import { useState } from 'react';

export const STYLE_PRESETS = [
    {
        id: 'ecommerce',
        name: 'E-commerce Clean',
        description: 'Professional white background, studio lighting',
        promptSuffix: 'Professional e-commerce product photography, clean white background, studio lighting, high resolution, sharp details'
    },
    {
        id: 'lifestyle',
        name: 'Lifestyle',
        description: 'Natural setting, warm and inviting',
        promptSuffix: 'Lifestyle product photography, natural setting, warm lighting, authentic feel, high quality'
    },
    {
        id: 'minimalist',
        name: 'Minimalist',
        description: 'Simple, elegant, lots of whitespace',
        promptSuffix: 'Minimalist product photography, simple composition, elegant, lots of negative space, clean aesthetic'
    },
    {
        id: 'bold',
        name: 'Bold & Colorful',
        description: 'Vibrant colors, energetic feel',
        promptSuffix: 'Bold colorful product photography, vibrant colors, energetic, eye-catching, dynamic composition'
    },
    {
        id: 'premium',
        name: 'Premium Luxury',
        description: 'Dark background, dramatic lighting',
        promptSuffix: 'Premium luxury product photography, dark moody background, dramatic lighting, sophisticated, high-end aesthetic'
    },
    {
        id: 'natural',
        name: 'Natural Organic',
        description: 'Earth tones, natural textures',
        promptSuffix: 'Natural organic product photography, earth tones, natural textures, sustainable feel, authentic'
    },
    {
        id: 'custom',
        name: '✏️ Custom',
        description: 'Define your own style',
        promptSuffix: ''
    }
];

export default function StylePresets({
    selected,
    onSelect,
    customStyle,
    customValue, // backward compatibility
    onCustomStyleChange,
    onCustomChange // backward compatibility
}) {
    const isCustom = selected === 'custom';
    const currentCustomValue = customStyle || customValue || '';
    const handleCustomChange = onCustomStyleChange || onCustomChange;

    return (
        <div className="style-presets">
            <div className="presets-grid">
                {STYLE_PRESETS.map((preset, index) => (
                    <button
                        key={preset.id}
                        type="button"
                        className={`preset-card ${selected === preset.id ? 'selected' : ''}`}
                        onClick={() => onSelect(preset.id)}
                        style={{
                            animationDelay: `${index * 0.05}s`,
                        }}
                    >
                        <div className="preset-name">{preset.name}</div>
                        <div className="preset-description">{preset.description}</div>
                    </button>
                ))}
            </div>

            {/* Custom Style Input */}
            {isCustom && (
                <div className="custom-style-input animate-fade-in" style={{ marginTop: 'var(--spacing-md)' }}>
                    <textarea
                        className="form-textarea"
                        placeholder="Describe your custom style... e.g., 'Vintage polaroid look, soft focus, nostalgic colors'"
                        value={currentCustomValue}
                        onChange={(e) => handleCustomChange && handleCustomChange(e.target.value)}
                        rows={2}
                    />
                </div>
            )}
        </div>
    );
}
