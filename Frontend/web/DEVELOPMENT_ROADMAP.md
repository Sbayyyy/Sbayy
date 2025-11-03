# 🚀 Sbay Frontend - Development Roadmap

## 📊 Projekt-Übersicht

**Sbay** ist ein Webshop + Secondhand Marketplace für Syrien (wie eBay + Amazon kombiniert)
- 🏪 Neue Produkte von Händlern
- 🔄 Gebrauchte Produkte von Privatpersonen
- 💰 Sichere Transaktionen
- 📱 Responsive Design (Web + Mobile)

---

## ✅ Phase 0: Foundation (ABGESCHLOSSEN)

### Was wurde bereits implementiert:

- [x] **Project Setup**
  - Next.js + TypeScript + Tailwind CSS
  - Zustand State Management
  - Axios API Client mit Interceptors
  - Shared Package für Types & Utils

- [x] **Authentication System**
  - Login Page (`/auth/login`)
  - Register Page (`/auth/register`)
  - Forgot Password Page (`/auth/forgetPassword`)
  - Auth Store (Zustand) mit Token Management
  - API Service Layer (`api/auth.ts`)

- [x] **Listing Creation**
  - Sell Page (`/listing/sell`)
  - FormData mit Validierung
  - Image Upload Component (Drag & Drop, Preview, Delete)
  - Arabic Error Messages
  - API Service (`api/listings.ts`)

- [x] **Product Detail Page**
  - Dynamic Route (`/listing/[id]`)
  - Image Gallery mit Thumbnails
  - Product Info (Titel, Preis, Beschreibung, Details)
  - Seller Info Card
  - Action Buttons (Warenkorb, Kaufen, Kontaktieren)
  - Mock Data zum Testen

- [x] **Shared Types & Validation**
  - Product, User, Category Types
  - Validation Functions mit Arabic Messages
  - API Response Types

---

## 🔥 Phase 1: Grundlegende Shop-Funktionalität (AKTUELLE PRIORITÄT)

> **Ziel:** User können Produkte finden, durchsuchen und ansehen

### 1.1 Product Card Component
**Status:** ❌ TODO  
**Geschätzte Zeit:** 30 Min  
**Datei:** `components/ProductCard.tsx`

**Features:**
- Produkt-Bild (mit Fallback)
- Titel (gekürzt wenn zu lang)
- Preis (formatiert in SYP)
- Zustand-Badge (neu/gebraucht/refurbished)
- Standort-Icon mit Location
- Favorit-Button (Herz)
- Click → Weiterleitung zur Detail-Seite
- Hover-Effekte
- Responsive Grid-Layout

**Tech:**
```typescript
interface ProductCardProps {
  product: Product;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
}
```

---

### 1.2 Layout Components
**Status:** ❌ TODO  
**Geschätzte Zeit:** 45 Min  
**Dateien:** 
- `components/Layout.tsx`
- `components/Header.tsx`
- `components/Footer.tsx`

**Features:**

#### Header/Navbar:
- Logo (Link zur Homepage)
- Hauptnavigation (Home, Kategorien, Verkaufen)
- Suchleiste (mit Icon)
- Warenkorb-Icon (mit Badge für Item-Count)
- User-Menu (eingeloggt) oder Login-Button
- Mobile Hamburger Menu
- Sticky on Scroll

#### Footer:
- Über uns, Hilfe, Kontakt
- Für Verkäufer (Verkaufsguide, Gebühren)
- Social Media Links
- Copyright

#### Layout Wrapper:
- Wrapper für alle Pages
- Header + Content + Footer
- SEO Meta Tags
- RTL Support

---

### 1.3 Browse/Listing Page
**Status:** ❌ TODO  
**Geschätzte Zeit:** 1h  
**Datei:** `pages/browse.tsx` oder `pages/products/index.tsx`

**Features:**
- Grid von Product Cards
- API Integration (`getAllListings`)
- Pagination (Load More oder Page Numbers)
- Loading Skeleton
- Empty State ("Keine Produkte gefunden")
- Error Handling
- Pull-to-Refresh (mobile)

**Tech:**
```typescript
// State Management
const [products, setProducts] = useState<Product[]>([]);
const [loading, setLoading] = useState(true);
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

// API Call
const loadProducts = async () => {
  const data = await getAllListings(page, 20);
  setProducts([...products, ...data.items]);
};
```

---

### 1.4 Homepage Integration
**Status:** ❌ TODO  
**Geschätzte Zeit:** 30 Min  
**Datei:** `pages/index.tsx` (Update)

**Changes:**
- Featured Products → Echte Daten von API
- Categories → Echte Kategorien (später aus Backend)
- "Trendige Produkte" Section
- "Neu eingestellt" Section
- Links zu Browse Page

---

## 🔍 Phase 2: Such- & Filter-Funktionen

> **Ziel:** User können gezielt Produkte finden

### 2.1 Suchfunktion
**Status:** ⏳ GEPLANT  
**Geschätzte Zeit:** 1h  
**Dateien:**
- `components/SearchBar.tsx` (verbessert)
- `pages/search.tsx`
- `api/search.ts`

**Features:**
- Suchleiste im Header (funktional)
- Live-Suche (Autocomplete optional)
- Search Results Page
- Highlight von Suchbegriffen
- "Meintest du...?" (Spell-Check)
- Suchhistorie (Local Storage)

---

### 2.2 Filter & Sortierung
**Status:** ⏳ GEPLANT  
**Geschätzte Zeit:** 2h  
**Dateien:**
- `components/FilterSidebar.tsx`
- `components/SortDropdown.tsx`
- Update `pages/browse.tsx`

**Features:**

#### Filter:
- 📁 Kategorie (Multi-Select)
- 💰 Preis-Range (Slider)
- 📦 Zustand (neu/gebraucht/refurbished)
- 📍 Standort (Dropdown)
- ✅ Nur verfügbare Produkte
- ⭐ Verkäufer-Rating (optional)

#### Sortierung:
- 🔥 Beliebteste (views)
- 🆕 Neueste (createdAt)
- 💵 Preis aufsteigend
- 💰 Preis absteigend
- ⭐ Beste Bewertung

**Tech:**
```typescript
interface FilterOptions {
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  condition?: ('new' | 'used' | 'refurbished')[];
  location?: string;
  inStock?: boolean;
}

interface SortOption {
  field: 'price' | 'createdAt' | 'views' | 'rating';
  order: 'asc' | 'desc';
}
```

---

### 2.3 Kategorie-Seiten
**Status:** ⏳ GEPLANT  
**Geschätzte Zeit:** 1h  
**Datei:** `pages/category/[slug].tsx`

**Features:**
- Dynamic Route für jede Kategorie
- Gefilterte Produkte nur aus dieser Kategorie
- Breadcrumb Navigation
- Kategorie-spezifische Banner
- Sub-Kategorien (wenn vorhanden)

---

## 🛒 Phase 3: Kaufen-Funktionalität

> **Ziel:** User können Produkte kaufen

### 3.1 Shopping Cart Store
**Status:** ⏳ GEPLANT  
**Geschätzte Zeit:** 1h  
**Datei:** `lib/cartStore.ts`

**Features:**
- Zustand Store für Cart Items
- Add to Cart
- Remove from Cart
- Update Quantity
- Calculate Total
- Persist in LocalStorage
- Stock Validation

**Tech:**
```typescript
interface CartItem {
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}
```

---

### 3.2 Cart Page & Sidebar
**Status:** ⏳ GEPLANT  
**Geschätzte Zeit:** 1.5h  
**Dateien:**
- `pages/cart.tsx`
- `components/CartSidebar.tsx`
- `components/CartItem.tsx`

**Features:**
- Cart Sidebar (Slide-in von rechts)
- Produkt-Liste mit Thumbnails
- Quantity Selector
- Remove Button
- Subtotal pro Item
- Gesamtpreis (Total)
- "Zur Kasse" Button
- Empty Cart State

---

### 3.3 Checkout Page
**Status:** ⏳ GEPLANT  
**Geschätzte Zeit:** 3h  
**Dateien:**
- `pages/checkout.tsx`
- `components/checkout/AddressForm.tsx`
- `components/checkout/PaymentMethod.tsx`
- `components/checkout/OrderSummary.tsx`

**Features:**

#### Steps:
1. **Lieferadresse**
   - Name, Telefon, Adresse, Stadt
   - Adresse speichern für später

2. **Zahlungsmethode**
   - Nachnahme (Cash on Delivery)
   - Bank Transfer (optional)
   - Kreditkarte (später)

3. **Bestellübersicht**
   - Alle Items
   - Lieferkosten
   - Total
   - AGB akzeptieren

4. **Bestellung abschicken**
   - Loading State
   - Success/Error Message
   - Weiterleitung zu Order-Details

**API:**
```typescript
interface Order {
  items: CartItem[];
  shippingAddress: Address;
  paymentMethod: string;
  total: number;
}

// POST /api/orders
const createOrder = async (order: Order) => { ... }
```

---

## 👤 Phase 4: Verkäufer-Features

> **Ziel:** Verkäufer können ihre Listings verwalten

### 4.1 User Dashboard
**Status:** ⏳ GEPLANT  
**Geschätzte Zeit:** 2h  
**Dateien:**
- `pages/dashboard/index.tsx`
- `pages/dashboard/listings.tsx`
- `components/dashboard/Sidebar.tsx`

**Features:**
- Dashboard Navigation (Sidebar)
- Übersicht (Stats: Verkäufe, Views, Favoriten)
- Meine Listings (Grid/List View)
- Quick Actions (Edit, Delete, Deaktivieren)
- Verkaufshistorie

---

### 4.2 Edit Listing
**Status:** ⏳ GEPLANT  
**Geschätzte Zeit:** 1h  
**Datei:** `pages/dashboard/listings/edit/[id].tsx`

**Features:**
- Formular (wie Sell Page, aber mit Pre-Fill)
- Bilder bearbeiten (neue hochladen, alte löschen)
- Status ändern (aktiv/inaktiv)
- Löschen-Button mit Bestätigung
- API Integration (`updateListing`, `deleteListing`)

---

### 4.3 Order Management
**Status:** ⏳ GEPLANT  
**Geschätzte Zeit:** 2h  
**Dateien:**
- `pages/dashboard/orders/purchases.tsx` (Meine Käufe)
- `pages/dashboard/orders/sales.tsx` (Meine Verkäufe)
- `pages/dashboard/orders/[id].tsx` (Order Details)

**Features:**

#### Meine Käufe:
- Liste aller bestellten Produkte
- Status (Bestellt, Versendet, Geliefert)
- Tracking Info
- Verkäufer kontaktieren
- Bewertung abgeben

#### Meine Verkäufe:
- Liste aller verkauften Produkte
- Bestelldetails
- Kunde kontaktieren
- Status aktualisieren
- Versandlabel drucken (optional)

---

## 💬 Phase 5: Social Features

> **Ziel:** Kommunikation zwischen Käufern und Verkäufern

### 5.1 Messaging System
**Status:** ⏳ GEPLANT  
**Geschätzte Zeit:** 4h  
**Dateien:**
- `pages/messages/index.tsx` (Inbox)
- `pages/messages/[conversationId].tsx` (Chat)
- `components/MessageList.tsx`
- `components/MessageInput.tsx`
- `api/messages.ts`

**Features:**
- Inbox mit Konversationsliste
- Chat-Interface (WhatsApp-Style)
- Nachrichten senden/empfangen
- Ungelesen-Badge
- Produktkontext (Referenz zum Produkt)
- Bilder senden (optional)
- Real-time mit WebSocket (optional, später)

**Tech:**
```typescript
interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  productId?: string;
  content: string;
  read: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  participant: User;
  product?: Product;
  lastMessage: Message;
  unreadCount: number;
}
```

---

### 5.2 Reviews & Ratings
**Status:** ⏳ GEPLANT  
**Geschätzte Zeit:** 3h  
**Dateien:**
- `components/ReviewList.tsx`
- `components/ReviewForm.tsx`
- `components/RatingStars.tsx`
- `api/reviews.ts`

**Features:**

#### Produkt-Bewertungen:
- Sterne-Rating (1-5)
- Text-Review
- Bilder (optional)
- Hilfreich-Button (Upvote)
- Antwort vom Verkäufer

#### Verkäufer-Bewertungen:
- Durchschnittliche Rating
- Anzahl Bewertungen
- Filter (Positiv/Negativ)
- Verkäufer-Profil mit allen Reviews

**Tech:**
```typescript
interface Review {
  id: string;
  userId: string;
  productId: string;
  sellerId: string;
  rating: number; // 1-5
  comment: string;
  images?: string[];
  helpful: number;
  createdAt: string;
}
```

---

### 5.3 Seller Profile Page
**Status:** ⏳ GEPLANT  
**Geschätzte Zeit:** 2h  
**Datei:** `pages/seller/[id].tsx`

**Features:**
- Verkäufer-Info (Name, Avatar, Member Since)
- Rating & Reviews
- Alle Produkte vom Verkäufer
- Verkäufer kontaktieren
- Verkäufer folgen (optional)
- Statistiken (Verkäufe, Antwortzeit)

---

## 🎨 Phase 6: UX Verbesserungen

> **Ziel:** Bessere User Experience

### 6.1 Advanced Components
**Status:** ⏳ GEPLANT  

**Features:**
- Loading Skeletons (statt Spinner)
- Infinite Scroll (statt Pagination)
- Image Zoom (auf Detail-Seite)
- Toast Notifications (statt Alerts)
- Lightbox für Bilder
- Breadcrumb Navigation
- Back-to-Top Button

---

### 6.2 Favorites/Wishlist
**Status:** ⏳ GEPLANT  
**Geschätzte Zeit:** 1.5h  
**Dateien:**
- `pages/favorites.tsx`
- `lib/favoritesStore.ts`

**Features:**
- Favoriten-Liste
- Herz-Button überall
- Sync mit Backend (optional)
- Email-Benachrichtigung bei Preisänderung

---

### 6.3 Notifications
**Status:** ⏳ GEPLANT  
**Geschätzte Zeit:** 2h  
**Dateien:**
- `components/NotificationBell.tsx`
- `pages/notifications.tsx`

**Features:**
- Notification Bell im Header
- Ungelesen-Badge
- Dropdown mit letzten Notifications
- Typen: Neue Nachricht, Bestellung, Preisänderung
- Mark as Read
- Push Notifications (PWA, optional)

---

### 6.4 PWA (Progressive Web App)
**Status:** ⏳ GEPLANT  
**Geschätzte Zeit:** 2h  

**Features:**
- Service Worker
- Offline Support
- Add to Home Screen
- App-Icon
- Splash Screen

---

## 📱 Phase 7: Mobile App (React Native)

> **Ziel:** Native Mobile Experience

**Status:** ⏳ GEPLANT  
**Ordner:** `Frontend/mobile/`

**Features:**
- React Native + Expo
- Shared API/Types mit Web
- Native Navigation
- Camera Integration (Produkte fotografieren)
- Push Notifications
- QR Code Scanner (optional)

---

## 🔒 Phase 8: Admin Panel

> **Ziel:** Plattform-Verwaltung

**Status:** ⏳ SPÄTER  
**Dateien:** `pages/admin/*`

**Features:**
- User Management
- Product Moderation
- Order Management
- Analytics Dashboard
- Reports (Betrug, etc.)
- Settings

---

## 📊 Fortschritt-Tracking

### Gesamt-Übersicht:
```
Phase 0 (Foundation):         ████████████████████ 100% ✅
Phase 1 (Shop Basics):        ░░░░░░░░░░░░░░░░░░░░   0% 🔥 JETZT
Phase 2 (Search & Filter):    ░░░░░░░░░░░░░░░░░░░░   0% ⏳
Phase 3 (Checkout):           ░░░░░░░░░░░░░░░░░░░░   0% ⏳
Phase 4 (Seller Features):    ░░░░░░░░░░░░░░░░░░░░   0% ⏳
Phase 5 (Social):             ░░░░░░░░░░░░░░░░░░░░   0% ⏳
Phase 6 (UX):                 ░░░░░░░░░░░░░░░░░░░░   0% ⏳
Phase 7 (Mobile):             ░░░░░░░░░░░░░░░░░░░░   0% ⏳
Phase 8 (Admin):              ░░░░░░░░░░░░░░░░░░░░   0% ⏳
```

### Team-Zuständigkeiten:
- **Eyas (Du):** Frontend (Web) ✅
- **Mo (Kollege):** Backend (C# .NET) ✅
- **Mobile:** TBD

---

## 🛠️ Tech Stack

### Frontend:
- **Framework:** Next.js 13+ (App Router oder Pages Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State:** Zustand (Auth, Cart, Favorites)
- **API Client:** Axios mit Interceptors
- **Icons:** Lucide React
- **Forms:** React Hook Form (optional)
- **Validation:** Zod (optional)

### Backend (Mo's Bereich):
- **Framework:** ASP.NET Core
- **Database:** SQL Server (EF Core)
- **Auth:** JWT + Refresh Tokens
- **Storage:** Azure Blob / Local
- **API:** RESTful

### Shared:
- **Monorepo:** Workspace mit `packages/shared`
- **Types:** TypeScript Interfaces
- **Utils:** Validation Functions

---

## 📝 Nächste Schritte

### Sofort (diese Woche):
1. ✅ Product Card Component
2. ✅ Layout (Header/Footer)
3. ✅ Browse/Listing Page
4. ✅ Homepage Integration

### Danach (nächste Woche):
5. ⏳ Suchfunktion
6. ⏳ Filter & Sortierung
7. ⏳ Shopping Cart

### Später:
- Checkout
- Dashboard
- Messaging
- Reviews

---

## 🚀 Quick Start für Entwickler

```bash
# Frontend starten
cd Frontend/web
npm install
npm run dev
# → http://localhost:3000

# Backend starten (Mo)
cd Backend/SBay.Backend
dotnet run
# → http://localhost:5000

# Mobile starten
cd Frontend/mobile
npm install
npx expo start
```

---

## 📞 Kontakt & Support

- **Frontend Lead:** Eyas
- **Backend Lead:** Mo
- **Projekt:** Sbay - Syrian Marketplace
- **Repository:** github.com/Sbayyyy/Sbayy
- **Branch:** `listing` (current), `main` (production)

---

## 🎯 Erfolgs-Metriken

### MVP (Minimum Viable Product):
- ✅ User können sich registrieren/einloggen
- ✅ User können Produkte erstellen
- ✅ User können Produkte ansehen
- ❌ User können Produkte durchsuchen → **Phase 1**
- ❌ User können Produkte kaufen → **Phase 3**

### Launch-Ready:
- Alle Phase 1-5 Features
- Mobile App (basic)
- 100+ Test-Produkte
- Performance optimiert
- SEO optimiert
- Sicherheit geprüft

---

**Letzte Aktualisierung:** 2. November 2025  
**Version:** 0.2.0  
**Status:** In Active Development 🚀
