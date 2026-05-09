import { api } from '../api';

export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('files', file);

  const response = await api.post('/uploads/images', formData);
  return response.data;
};

export const uploadImages = async (files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await api.post('/uploads/images', formData);
  return response.data;
};
