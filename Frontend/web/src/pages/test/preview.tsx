import { useState } from 'react';
import AddressForm from '@/components/checkout/AddressForm';
import PaymentMethod from '@/components/checkout/PaymentMethod';
import OrderSummary from '@/components/checkout/OrderSummary';
import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import CartItem from '@/components/CartItem';
import CartSidebar from '@/components/CartSidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Address, Product } from '@sbay/shared';
import { useCartStore } from '@/lib/cartStore';
import Layout from '@/components/Layout';
import Link from 'next/link';

type ComponentCategory = 'checkout' | 'products' | 'cart' | 'layout';
type ComponentType = 
  | 'address' | 'payment' | 'summary' | 'orderConfirmation'
  | 'productCard' | 'productSkeleton' 
  | 'cartItem' | 'cartSidebar'
  | 'header' | 'footer';

/**
 * Component Preview Hub
 * 
 * Zentrale Seite zum Testen aller Components in Isolation
 * URL: /preview
 */
export default function ComponentPreviewPage() {
  const { items, addItem, removeItem, updateQuantity } = useCartStore();
  const [activeComponent, setActiveComponent] = useState<ComponentType>('address');
  const [cartSidebarOpen, setCartSidebarOpen] = useState(false);
  const [address, setAddress] = useState<Address>({
    name: '',
    phone: '',
    street: '',
    city: '',
    region: ''
  });
  const [saveAddress, setSaveAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer' | 'meet_in_person'>('cod');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Mock Product Data
  const mockProduct: Product = {
    id: 'PROD-001',
    title: 'iPhone 12 Pro 128GB',
    description: 'Gebraucht, guter Zustand mit Originalverpackung',
    priceAmount: 15000,
    priceCurrency: 'SYP',
    imageUrls: ['https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=800'],
    condition: 'Used',
    region: 'Damascus',
    stock: 1,
    thumbnailUrl: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=400',
    createdAt: new Date().toISOString(),
    seller: {
      id: 'USER-001',
      name: 'Ahmed Al-Hakim',
      rating: 4.8
    },
    status: 'active',
    views: 245,
    updatedAt: new Date().toISOString()
  };

  const componentsConfig: Record<ComponentType, { label: string; category: ComponentCategory }> = {
    // Checkout
    address: { label: 'AddressForm', category: 'checkout' },
    payment: { label: 'PaymentMethod', category: 'checkout' },
    summary: { label: 'OrderSummary', category: 'checkout' },
    orderConfirmation: { label: 'Order Confirmation', category: 'checkout' },
    // Products
    productCard: { label: 'ProductCard', category: 'products' },
    productSkeleton: { label: 'ProductCardSkeleton', category: 'products' },
    // Cart
    cartItem: { label: 'CartItem', category: 'cart' },
    cartSidebar: { label: 'CartSidebar', category: 'cart' },
    // Layout
    header: { label: 'Header', category: 'layout' },
    footer: { label: 'Footer', category: 'layout' }
  };

  const categories: Record<ComponentCategory, string> = {
    checkout: '🛒 Checkout',
    products: '📦 Products',
    cart: '🛍️ Cart',
    layout: '🎨 Layout'
  };

  return (
    <Layout title="Component Preview">
      <div className="bg-gray-50 min-h-screen py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">🧪 Component Preview Hub</h1>
              <p className="text-gray-600">Teste alle {Object.keys(componentsConfig).length} Components (Checkout, Products, Cart, Layout)</p>
            </div>
            <Link href="/test/api-preview" className="text-blue-600 hover:underline font-medium flex items-center gap-2">
              API Preview →
            </Link>
          </div>

          {/* Sidebar Navigation */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-24 max-h-[85vh] overflow-y-auto">
                <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 px-2">
                  Components ({Object.keys(componentsConfig).length})
                </h3>
                
                {/* Group by Category */}
                {(Object.entries(categories) as [ComponentCategory, string][]).map(([category, label]) => {
                  const categoryComponents = Object.entries(componentsConfig)
                    .filter(([, config]) => config.category === category) as [ComponentType, typeof componentsConfig[ComponentType]][];
                  
                  return (
                    <div key={category} className="mb-6">
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 px-2">{label}</h4>
                      <div className="space-y-1">
                        {categoryComponents.map(([compType, config]) => (
                          <button
                            key={compType}
                            onClick={() => setActiveComponent(compType)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              activeComponent === compType
                                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {config.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold mb-4">{componentsConfig[activeComponent].label}</h2>
                
                {/* CHECKOUT COMPONENTS */}
                {activeComponent === 'address' && (
                  <AddressForm
                    value={address}
                    onChange={setAddress}
                    onSaveAddress={setSaveAddress}
                    saveAddressFlag={saveAddress}
                  />
                )}

                {activeComponent === 'payment' && (
                  <PaymentMethod
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                  />
                )}

                {activeComponent === 'summary' && (
                  <OrderSummary
                    items={items.length > 0 ? items : [{product: mockProduct, quantity: 2, addedAt: new Date().toISOString()}]}
                    shippingCost={500}
                    onAgreed={setAgreedToTerms}
                    agreedToTerms={agreedToTerms}
                  />
                )}

                {activeComponent === 'orderConfirmation' && (
                  <div className="bg-gray-50 p-8 rounded-lg" dir="rtl">
                    {/* Success Card */}
                    <div className="bg-white rounded-lg shadow-sm border p-8 text-center max-w-2xl mx-auto">
                      {/* Checkmark Icon */}
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>

                      {/* Title */}
                      <h1 className="text-3xl font-bold text-gray-900 mb-3">
                        تم تقديم الطلب بنجاح!
                      </h1>

                      {/* Subtitle with Order Number */}
                      <p className="text-gray-600 mb-8">
                        شكراً لطلبك. رقم طلبك هو <span className="font-bold text-blue-600">#ORD-DEMO-123</span>
                      </p>

                      {/* Order Info Grid */}
                      <div className="bg-gray-50 rounded-lg p-6 space-y-4 mb-8">
                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                          <span className="text-gray-600">التسليم المتوقع</span>
                          <span className="font-semibold text-gray-900">
                            3-5 أيام عمل
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                          <span className="text-gray-600">عنوان التوصيل</span>
                          <span className="font-semibold text-gray-900">
                            دمشق
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                          <span className="text-gray-600">إجمالي المبلغ</span>
                          <span className="font-bold text-blue-600 text-xl">
                            330,000 ل.س
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-4">
                        <button className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold text-center hover:bg-gray-50 transition-colors">
                          متابعة التسوق
                        </button>
                        <button className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold text-center hover:bg-blue-700 transition-colors">
                          عرض حالة الطلب
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* PRODUCT COMPONENTS */}
                {activeComponent === 'productCard' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ProductCard product={mockProduct} />
                    <ProductCard product={{...mockProduct, id: 'PROD-002', title: 'Samsung Galaxy S21', priceAmount: 12000}} />
                    <ProductCard product={{...mockProduct, id: 'PROD-003', title: 'Laptop HP', priceAmount: 45000, condition: 'New'}} />
                  </div>
                )}

                {activeComponent === 'productSkeleton' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ProductCardSkeleton />
                    <ProductCardSkeleton />
                    <ProductCardSkeleton />
                  </div>
                )}

                {/* CART COMPONENTS */}
                {activeComponent === 'cartItem' && (
                  <div className="space-y-4">
                    {items.length > 0 ? (
                      items.map((item) => (
                        <CartItem
                          key={item.product.id}
                          item={item}
                          onUpdateQuantity={(qty) => updateQuantity(item.product.id, qty)}
                          onRemove={() => removeItem(item.product.id)}
                        />
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <p>Warenkorb ist leer. Füge Produkte hinzu um CartItem zu sehen.</p>
                        <button
                          onClick={() => addItem(mockProduct, 1)}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Mock Produkt hinzufügen
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeComponent === 'cartSidebar' && (
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600 mb-4">
                      CartSidebar nutzt den globalen Zustand. Klicke auf das Warenkorb-Icon im Header oder:
                    </p>
                    <button
                      onClick={() => {
                        if (items.length === 0) addItem(mockProduct, 1);
                        useCartStore.getState().openCart();
                      }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Öffne Cart Sidebar (mit {items.length} Items)
                    </button>
                    <CartSidebar />
                  </div>
                )}

                {/* LAYOUT COMPONENTS */}
                {activeComponent === 'header' && (
                  <div className="border rounded-lg overflow-hidden">
                    <Header />
                  </div>
                )}

                {activeComponent === 'footer' && (
                  <div className="border rounded-lg overflow-hidden">
                    <Footer />
                  </div>
                )}
              </div>

              {/* State Display */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold mb-4">📊 Component State</h3>
              <h3 className="text-lg font-bold mb-4">📋 Component State</h3>
              
              {activeComponent === 'address' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Address Object</p>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{JSON.stringify(address, null, 2)}
                    </pre>
                  </div>
                  
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Save Address</p>
                    <p className="text-sm font-mono">{saveAddress ? 'true' : 'false'}</p>
                  </div>

                  <hr />

                  <div className="text-xs text-gray-600">
                    <p className="font-semibold mb-2">✅ Validation:</p>
                    <ul className="space-y-1">
                      <li>Name: {address.name ? '✓' : '✗'}</li>
                      <li>Phone: {address.phone ? '✓' : '✗'}</li>
                      <li>Street: {address.street ? '✓' : '✗'}</li>
                      <li>City: {address.city ? '✓' : '✗'}</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeComponent === 'payment' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Payment Method</p>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-40">
{JSON.stringify({ paymentMethod }, null, 2)}
                    </pre>
                  </div>

                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs font-semibold text-blue-900 mb-2">ℹ️ Selected Method:</p>
                    <p className="text-sm text-blue-800">
                      {paymentMethod === 'cod' 
                        ? '💰 Nachnahme (COD) - Beliebte Option'
                        : '🏦 Banküberweisung - Mit Bank-Details'}
                    </p>
                  </div>
                </div>
              )}

              {activeComponent === 'summary' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Order State</p>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-40">
{JSON.stringify({
  itemsCount: items.length,
  shippingCost: 35,
  agreedToTerms,
  city: address.city || 'Not selected'
}, null, 2)}
                    </pre>
                  </div>

                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <p className="text-xs font-semibold text-green-900 mb-2">✓ Summary Ready:</p>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>Items: {items.length}</li>
                      <li>Shipping: 35 SYP</li>
                      <li>Terms Agreed: {agreedToTerms ? '✓' : '✗'}</li>
                    </ul>
                  </div>
                </div>
              )}
                
                {/* Universal State Display */}
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Current State</p>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-60">
{JSON.stringify({ activeComponent, itemsCount: items.length }, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-blue-900 mb-2">🧪 Component Preview - Testing Environment</h3>
            <p className="text-sm text-blue-800 mb-3">
              Diese Seite testet alle <strong>{Object.keys(componentsConfig).length} Components</strong> in Isolation. Sie wird <strong>nicht in Production</strong> deployed.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-800 mb-4">
              <div>
                <strong>🛒 Checkout (4)</strong><br/>
                Address, Payment, Summary, Order Confirmation
              </div>
              <div>
                <strong>📦 Products (2)</strong><br/>
                Card, Skeleton
              </div>
              <div>
                <strong>🛍️ Cart (2)</strong><br/>
                Item, Sidebar
              </div>
              <div>
                <strong>🎨 Layout (2)</strong><br/>
                Header, Footer
              </div>
            </div>
            
            {/* Full Pages Section */}
            <div className="border-t border-blue-300 pt-4 mt-4">
              <p className="text-sm text-blue-800 mb-3">
                <strong>📄 Vollständige Pages (1):</strong>
              </p>
              <div className="flex gap-4">
                <Link 
                  href="/checkout" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-600 text-blue-700 rounded-lg hover:bg-blue-50 font-semibold text-sm transition-colors"
                >
                  🛒 Checkout Page →
                </Link>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                💡 Order Confirmation Vorschau ist oben in Components verfügbar
              </p>
            </div>

            <p className="text-sm text-blue-800 mt-4">
              <strong>Für API Testing:</strong> <Link href="/test/api-preview" className="font-bold underline">API Preview (/test/api-preview)</Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
