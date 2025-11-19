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

// Product types (matched to Backend ListingResponse)
export interface Product {
  id: string;
  title: string;
  description: string;
  priceAmount: number;        // Backend field name
  priceCurrency: string;      // Backend field name
  imageUrls: string[];        // Backend field name
  categoryPath?: string;      // Backend field name
  condition: string;          // Backend: "New" | "Used" | "Refurbished" (PascalCase)
  region?: string;            // Backend field name
  stock: number;              // Backend field name
  thumbnailUrl?: string;      // Backend field name
  createdAt: string;
  
  // Optional frontend helper properties
  seller?: {
    id: string;
    name: string;
    rating?: number;
  };
  status?: 'active' | 'sold' | 'inactive';
  views?: number;
  favorites?: number;
  updatedAt?: string;
}

export interface ProductCreate {
  title: string;
  description: string;
  priceAmount: number;
  priceCurrency?: string;
  imageUrls?: string[];
  categoryPath?: string;
  stock?: number;
  condition: string;  // "New" | "Used" | "Refurbished"
  region: string;
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

// Am Ende der Datei hinzufügen:

export interface ProductUpdate {
  title?: string;
  description?: string;
  priceAmount?: number;
  priceCurrency?: string;
  imageUrls?: string[];
  categoryPath?: string;
  condition?: string;
  region?: string;
  stock?: number;
  status?: 'active' | 'sold' | 'inactive';
}

// Seller Stats
export interface SellerStats {
  totalRevenue: number;
  totalOrders: number;
  newCustomers: number;
  conversionRate: number;
  revenueChange: number;
  ordersChange: number;
  customersChange: number;
  conversionChange: number;
  activeProducts: number;
  ordersCompleted: number;
  awaitingShipment: number;
}

// Order Interface
export interface Order {
  id: string;
  orderId: string;
  customerName: string;
  productName: string;
  quantity: number;
  amount: number;
  status: 'Shipped' | 'Processing' | 'Delivered' | 'Pending';
  payment: 'Paid' | 'Pending' | 'Waiting';
  date: string;
}

// Chart Data
export interface DailyRevenue {
  day: string;
  revenue: number;
}

export interface WeeklySales {
  week: string;
  sales: number;
}

// Search & Filter Types
export interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: 'New' | 'Used' | 'Refurbished' | 'LikeNew';
  region?: string;
  sortBy?: 'price' | 'date' | 'popular';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ===== CHECKOUT & ORDER TYPES =====

/**
 * Shipping Address für Orders
 * Wird vom User während Checkout eingegeben
 */
export interface Address {
  name: string;           // Vollständiger Name
  phone: string;          // Telefon (Syrian format: 09xx... oder +963...)
  street: string;         // Detaillierte Adresse (Straße, Hausnummer)
  city: string;           // Syrische Stadt/Governorate
  region?: string;        // Optional: Stadtviertel/Bezirk
}

/**
 * Versand-Information (von DHL/Carrier)
 * Wird nach Stadt berechnet
 */
export interface ShippingInfo {
  cost: number;                          // Versandkosten in SYP
  carrier: 'dhl' | 'other';              // Versandunternehmen
  estimatedDays: number;                 // Geschätzte Liefertage
  trackingNumber?: string;               // Tracking-Nummer (optional)
}

/**
 * Ein Artikel im Order
 */
export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;          // Preis pro Stück zum Zeitpunkt des Orders
}

/**
 * Order-Erstellung vom Frontend
 * Wird vom Checkout-Form gesendet
 */
export interface OrderCreate {
  items: OrderItem[];                           // Bestellte Produkte
  shippingAddress: Address;                     // Versand-Adresse
  paymentMethod: 'cod' | 'bank_transfer' | 'meet_in_person';       // COD = Cash on Delivery
  saveAddress?: boolean;                        // Adresse speichern für später?
}

/**
 * Order-Update (Status-Änderung, nur Backend)
 */
export interface OrderUpdate {
  status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
}

/**
 * Kompletter Order (Response von Backend)
 */
export interface OrderResponse {
  id: string;
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: 'cod' | 'bank_transfer';
  shippingInfo: ShippingInfo;
  total: number;                                        // Total mit Shipping
  subtotal: number;                                     // Total ohne Shipping
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

/**
 * Adresse speichern Request
 */
export interface SaveAddressRequest extends Address {
  // Erbt alle Felder von Address
}

/**
 * Versand-Kosten berechnen Request
 */
export interface CalculateShippingRequest {
  city: string;           // Zielstadt
  weight?: number;        // Optional: Gesamtgewicht
}