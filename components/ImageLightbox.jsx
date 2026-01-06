'use client';

import { useEffect, useCallback } from 'react';
import { downloadImage, getImageSrc } from '@/utils/downloadZip';

export default function ImageLightbox({ images, currentIndex, onClose, onNavigate }) {
    const currentImage = images[currentIndex];

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
            onNavigate(currentIndex - 1);
        } else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
            onNavigate(currentIndex + 1);
        }
    }, [currentIndex, images.length, onClose, onNavigate]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [handleKeyDown]);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleDownload = () => {
        const filename = currentImage.name || `image_${currentIndex + 1}.png`;
        downloadImage(currentImage, filename);
    };

    // Get image src - handles both S3 URLs and base64
    const imageSrc = getImageSrc(currentImage);

    if (!imageSrc) {
        return (
            <div className="lightbox-overlay" onClick={handleBackdropClick}>
                <div className="lightbox-container">
                    <div className="lightbox-header">
                        <span className="lightbox-counter">
                            {currentIndex + 1} / {images.length}
                        </span>
                        <button onClick={onClose} className="lightbox-btn lightbox-close">
                            ✕
                        </button>
                    </div>
                    <div className="lightbox-image-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <p>Unable to load image</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="lightbox-overlay" onClick={handleBackdropClick}>
            <div className="lightbox-container">
                {/* Header */}
                <div className="lightbox-header">
                    <span className="lightbox-counter">
                        {currentIndex + 1} / {images.length}
                    </span>
                    <span className="lightbox-title">{currentImage.name || `Image ${currentIndex + 1}`}</span>
                    <div className="lightbox-actions">
                        <button onClick={handleDownload} className="lightbox-btn">
                            ↓ Download
                        </button>
                        <button onClick={onClose} className="lightbox-btn lightbox-close">
                            ✕
                        </button>
                    </div>
                </div>

                {/* Image */}
                <div className="lightbox-image-wrapper">
                    {currentIndex > 0 && (
                        <button
                            className="lightbox-nav lightbox-prev"
                            onClick={() => onNavigate(currentIndex - 1)}
                        >
                            ‹
                        </button>
                    )}

                    <img
                        src={imageSrc}
                        alt={currentImage.name || `Image ${currentIndex + 1}`}
                        className="lightbox-image"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            const wrapper = e.target.parentElement;
                            if (wrapper) {
                                const errorMsg = document.createElement('p');
                                errorMsg.textContent = 'Failed to load image';
                                errorMsg.style.color = 'white';
                                wrapper.appendChild(errorMsg);
                            }
                        }}
                    />

                    {currentIndex < images.length - 1 && (
                        <button
                            className="lightbox-nav lightbox-next"
                            onClick={() => onNavigate(currentIndex + 1)}
                        >
                            ›
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
