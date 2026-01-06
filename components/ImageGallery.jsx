'use client';

import { useCallback } from 'react';

export default function ImageGallery({ images, onDownloadAll }) {
    const downloadImage = useCallback((imageData, filename) => {
        const link = document.createElement('a');
        link.href = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    const downloadAllAsZip = useCallback(async () => {
        if (onDownloadAll) {
            onDownloadAll();
            return;
        }

        // Fallback: download each image individually
        images.forEach((img, idx) => {
            setTimeout(() => {
                downloadImage(img.data, img.name || `image_${idx + 1}.png`);
            }, idx * 500);
        });
    }, [images, onDownloadAll, downloadImage]);

    if (!images || images.length === 0) {
        return (
            <div className="gallery-empty">
                <div className="gallery-empty-icon">🖼️</div>
                <p>Generated images will appear here</p>
            </div>
        );
    }

    return (
        <div>
            <div className="gallery-header">
                <h3>Generated Images ({images.length})</h3>
                <button onClick={downloadAllAsZip} className="btn btn-secondary">
                    📥 Download All
                </button>
            </div>

            <div className="gallery">
                {images.map((img, index) => (
                    <div key={index} className="gallery-item">
                        <img
                            src={img.data.startsWith('data:') ? img.data : `data:image/png;base64,${img.data}`}
                            alt={img.name || `Image ${index + 1}`}
                        />
                        <div className="gallery-overlay">
                            <span className="gallery-label">{img.name || `Image ${index + 1}`}</span>
                            <button
                                className="gallery-download"
                                onClick={() => downloadImage(img.data, img.name || `image_${index + 1}.png`)}
                            >
                                ↓
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
