'use client';

import { useCallback, useState, useRef } from 'react';

export default function ImageUploader({ onImageSelect, accept = ".jpg,.jpeg,.png,.webp" }) {
    const [preview, setPreview] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef(null);

    const handleFile = useCallback((file) => {
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a valid image file (JPG, PNG, or WebP)');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
            onImageSelect(file, reader.result);
        };
        reader.readAsDataURL(file);
    }, [onImageSelect]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    }, [handleFile]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleInputChange = useCallback((e) => {
        const file = e.target.files[0];
        handleFile(file);
    }, [handleFile]);

    const handleClick = useCallback(() => {
        inputRef.current?.click();
    }, []);

    const clearImage = useCallback(() => {
        setPreview(null);
        onImageSelect(null, null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }, [onImageSelect]);

    return (
        <div className="upload-wrapper">
            {preview ? (
                <div className="upload-preview">
                    <img src={preview} alt="Preview" className="preview-image" />
                    <button type="button" onClick={clearImage} className="preview-clear">
                        ✕ Remove
                    </button>
                </div>
            ) : (
                <div
                    className={`upload-area ${isDragOver ? 'dragover' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={handleClick}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept={accept}
                        onChange={handleInputChange}
                        className="upload-input"
                        style={{ display: 'none' }}
                    />
                    <div className="upload-content">
                        <div className="upload-icon">📷</div>
                        <div className="upload-title">Drop your image here</div>
                        <div className="upload-subtitle">or click to browse (JPG, PNG, WebP)</div>
                    </div>
                </div>
            )}
        </div>
    );
}
