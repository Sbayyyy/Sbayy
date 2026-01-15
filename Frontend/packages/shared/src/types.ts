// User types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  city?: string;
  avatar?: string;
  rating?: number;
  verified: boolean;
  createdAt: string;
  totalRevenue?: number;
  totalOrders?: number;
  pendingOrders?: number;
  reviewCount?: number;
  listingBanned?: boolean;
  listingBanUntil?: string;
  listingLimit?: number;
  listingLimitCount?: number;
  listingLimitResetAt?: string;
}

export interface UserRegistration {
  email: string;
  password: string;
  name: string;
  phone?: string;
  city?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

// Product types (matched to Backend ListingResponse)
export interface Product {
  id: string;
  sellerId?: string;
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
    avatar?: string;
    rating?: number;
    reviewCount?: number;
    city?: string;
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

// Message & Chat types (Backend compatible)
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  listingId?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Chat {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId?: string;
  createdAt: string;
  lastMessageAt?: string;
  buyerArchived: boolean;
  sellerArchived: boolean;
  messages: Message[];
}

export interface OpenChatRequest {
  otherUserId: string;
  listingId?: string;
}

export interface OpenChatResponse {
  id: string;
}

// Legacy types (keeping for compatibility)
export interface Conversation {
  id: string;
  participant: User;
  product?: Product;
  lastMessage: Message;
  unreadCount: number;
  updatedAt: string;
}

export interface ConversationCreate {
  receiverId: string;
  productId?: string;
  initialMessage: string;
}

export interface MessageSend {
  conversationId: string;
  content: string;
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
 * Gespeicherte Adresse (mit ID vom Backend)
 */
export interface SavedAddress extends Address {
  id: string;
  createdAt: string;
  updatedAt?: string;
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
  savedAddressId?: string;                      // Option 1: Gespeicherte Adresse verwenden
  newAddress?: Address;                         // Option 2: Neue Adresse (Backend speichert sie)
  paymentMethod: 'cod' | 'bank_transfer' | 'meet_in_person';       // COD = Cash on Delivery
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
  shippingAddress?: SavedAddress;                       // Optional: kann null sein bei pickup
  paymentMethod: 'cod' | 'bank_transfer' | 'meet_in_person';
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

// Review & Rating types
export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  productId?: string;
  sellerId?: string;
  orderId?: string;
  rating: number;         // 1-5
  comment: string;
  helpful: number;        // Count of helpful marks
  isHelpful?: boolean;    // Current user marked as helpful
  createdAt: string;
  updatedAt?: string;
}

export interface ReviewCreate {
  productId?: string;
  sellerId?: string;
  orderId?: string;
  rating: number;
  comment: string;
}

export interface ReviewUpdate {
  rating?: number;
  comment?: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
