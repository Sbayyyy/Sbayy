import { api } from '../api';

/**
 * Einzelnes Bild hochladen
 */
export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  
  // Don't set Content-Type manually - let browser set it with boundary
  const response = await api.post('/upload/image', formData);
  return response.data;
};

/**
 * Mehrere Bilder hochladen
 */
export const uploadImages = async (files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });
  
  // Don't set Content-Type manually - let browser set it with boundary
  const response = await api.post('/upload/images', formData);
  return response.data;
};