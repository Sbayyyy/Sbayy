// File: Frontend/web/src/components/imageUpload.tsx
import { useState, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { api } from '../lib/api';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export default function ImageUpload({ images, onChange, maxImages = 5 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files);

    if (images.length + fileArray.length > maxImages) {
      alert(`يمكنك رفع ${maxImages} صور كحد أقصى`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      fileArray.forEach(file => formData.append("files", file));
      const { data } = await api.post<{ urls: string[] }>("/uploads/images", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange([...images, ...data.urls]);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('حدث خطأ أثناء رفع الصور');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [images, maxImages, handleFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  // No object URL cleanup needed; images are remote URLs.

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        صور المنتج ({images.length}/{maxImages})
      </label>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-primary-600 bg-primary-50' : 'border-gray-300'
        } ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept="image/*"
          onChange={handleChange}
          disabled={images.length >= maxImages || uploading}
          className="hidden"
        />
        <label htmlFor="file-upload" className={images.length >= maxImages ? 'cursor-not-allowed' : 'cursor-pointer'}>
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            اسحب الصور هنا أو <span className="text-primary-600 font-semibold">اختر من الجهاز</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF حتى 10MB</p>
        </label>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mt-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img src={image} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={16} />
              </button>
              {index === 0 && (
                <span className="absolute bottom-1 left-1 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                  رئيسية
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <p className="text-sm text-gray-600 mt-2">جارٍ رفع الصور...</p>
        </div>
      )}
    </div>
  );
}
