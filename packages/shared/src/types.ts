// User types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  rating?: number;
  verified: boolean;
  createdAt: string;
}

export interface UserRegistration {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

// Product types
export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  condition: 'new' | 'used' | 'refurbished';
  location: string;
  seller: {
    id: string;
    name: string;
    rating?: number;
  };
  status: 'active' | 'sold' | 'inactive';
  views: number;
  favorites: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCreate {
  title: string;
  description: string;
  price: number;
  currency?: string;
  images?: string[];
  category: string;
  condition: 'new' | 'used' | 'refurbished';
  location: string;
}

// Category types
export interface Category {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  parentId?: string;
  slug: string;
}

// Message types
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  productId?: string;
  content: string;
  read: boolean;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// Auth types
export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}
