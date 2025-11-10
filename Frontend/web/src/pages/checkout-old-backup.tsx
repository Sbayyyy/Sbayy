import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import AddressForm from '@/components/checkout/AddressForm';
import PaymentMethod from '@/components/checkout/PaymentMethod';
import OrderSummary from '@/components/checkout/OrderSummary';
import { useCartStore, type CartItem } from '@/lib/cartStore';
import { createOrder, calculateShipping, saveAddress } from '../lib/api/orders';
import type { Address, OrderCreate } from '@sbay/shared';
import Link from 'next/link';
import { AlertCircle, ChevronRight, Loader2 } from 'lucide-react';

type CheckoutStep = 'address' | 'payment' | 'summary' | 'loading' | 'success' | 'error';

interface CheckoutState {
  address: Address | null;
  saveAddressFlag: boolean;
  paymentMethod: 'cod' | 'bank_transfer';
  shippingCost: number;
  agreedToTerms: boolean;
  loadingShipping: boolean;
  shippingError: string | null;
  orderError: string | null;
}

/**
 * Main Checkout Page
 * 
 * Multi-step checkout flow:
 * 1. Address Form
 * 2. Payment Method Selection
 * 3. Order Summary + Review
 * 4. Create Order (API Call)
 * 5. Success or Error
 * 
 * State Management:
 * - Local component state for form data
 * - Cart data from Zustand store (useCartStore)
 * - API calls via lib/api/orders.ts
 */
export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');
  const [state, setState] = useState<CheckoutState>({
    address: null,
    saveAddressFlag: false,
    paymentMethod: 'cod',
    shippingCost: 0,
    agreedToTerms: false,
    loadingShipping: false,
    shippingError: null,
    orderError: null
  });

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && currentStep === 'address') {
      router.push('/cart');
    }
  }, [items.length, currentStep, router]);

  // Calculate shipping when address or items change
  const handleAddressChange = async (newAddress: Address) => {
    setState(prev => ({ ...prev, address: newAddress, shippingError: null }));
    
    if (newAddress.city) {
      setState(prev => ({ ...prev, loadingShipping: true }));
      try {
        const shipping = await calculateShipping({
          city: newAddress.city,
          weight: items.reduce((sum, item) => sum + 0.5, 0) // Default 0.5kg per item
        });
        setState(prev => ({
          ...prev,
          shippingCost: shipping.cost,
          loadingShipping: false
        }));
      } catch (error) {
        console.error('Shipping calculation failed:', error);
        setState(prev => ({
          ...prev,
          shippingError: 'Versandkosten konnten nicht berechnet werden. Bitte versuchen Sie es später.',
          loadingShipping: false
        }));
      }
    }
  };

  const handleSaveAddress = (flag: boolean) => {
    setState(prev => ({ ...prev, saveAddressFlag: flag }));
  };

  const handlePaymentChange = (method: 'cod' | 'bank_transfer') => {
    setState(prev => ({ ...prev, paymentMethod: method }));
  };

  const handleAgreedToTerms = (agreed: boolean) => {
    setState(prev => ({ ...prev, agreedToTerms: agreed }));
  };

  // Step validation
  const isAddressValid = state.address && 
    state.address.name && 
    state.address.phone && 
    state.address.street && 
    state.address.city && 
    !state.loadingShipping;

  const canProceedToPayment = isAddressValid && !state.shippingError;
  const canProceedToSummary = canProceedToPayment;
  const canCreateOrder = state.agreedToTerms && state.address && items.length > 0;

  // Create order
  const handleCreateOrder = async () => {
    if (!canCreateOrder || !state.address) {
      setState(prev => ({ ...prev, orderError: 'Bitte füllen Sie alle erforderlichen Felder aus.' }));
      return;
    }

    setCurrentStep('loading');
    setState(prev => ({ ...prev, orderError: null }));

    try {
      // Save address if requested
      if (state.saveAddressFlag) {
        try {
          await saveAddress({
            name: state.address.name,
            phone: state.address.phone,
            street: state.address.street,
            city: state.address.city,
            region: state.address.region
          });
        } catch (err) {
          console.warn('Failed to save address, continuing with order creation:', err);
        }
      }

      // Create order payload
      const orderPayload: OrderCreate = {
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.priceAmount
        })),
        shippingAddress: state.address,
        paymentMethod: state.paymentMethod,
        saveAddress: state.saveAddressFlag
      };

      // Create order
      const order = await createOrder(orderPayload);

      // Clear cart on success
      clearCart();

      // Redirect to success page
      router.push(`/order-confirmation?orderId=${order.id}`);
    } catch (error) {
      console.error('Order creation failed:', error);
      setCurrentStep('error');
      setState(prev => ({
        ...prev,
        orderError: error instanceof Error 
          ? error.message 
          : 'Bestellung konnte nicht erstellt werden. Bitte versuchen Sie es später.'
      }));
    }
  };

  // If cart is empty, show message
  if (items.length === 0) {
    return (
      <Layout title="Checkout">
        <div className="bg-gray-50 min-h-screen py-12">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
              <h1 className="text-2xl font-bold mb-2">Warenkorb ist leer</h1>
              <p className="text-gray-600 mb-6">Fügen Sie Artikel hinzu, um fortzufahren.</p>
              <Link href="/browse" className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700">
                Zum Shopping
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Loading state
  if (currentStep === 'loading') {
    return (
      <Layout title="Checkout - Bestellung wird erstellt">
        <div className="bg-gray-50 min-h-screen py-12">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Loader2 size={48} className="mx-auto text-primary-600 mb-4 animate-spin" />
              <h2 className="text-xl font-bold mb-2">Bestellung wird erstellt...</h2>
              <p className="text-gray-600">Bitte warten Sie, während Ihre Bestellung verarbeitet wird.</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (currentStep === 'error') {
    return (
      <Layout title="Checkout - Fehler">
        <div className="bg-gray-50 min-h-screen py-12">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="bg-white rounded-lg border border-red-200 p-8">
              <div className="flex gap-4 mb-6">
                <AlertCircle className="text-red-500 flex-shrink-0" size={24} />
                <div>
                  <h2 className="text-xl font-bold text-red-900 mb-2">Fehler beim Erstellen der Bestellung</h2>
                  <p className="text-red-800 mb-4">{state.orderError}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCurrentStep('address');
                    setState(prev => ({ ...prev, orderError: null }));
                  }}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700"
                >
                  Zurück zum Checkout
                </button>
                <Link href="/browse" className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300">
                  Zum Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Checkout">
      <div className="bg-gray-50 min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">🛒 Checkout</h1>
            <p className="text-gray-600">Schritt {currentStep === 'address' ? '1' : currentStep === 'payment' ? '2' : '3'} von 3</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8 flex items-center gap-2 text-sm">
            <div className={`h-2 flex-1 rounded-full ${currentStep === 'address' || currentStep === 'payment' || currentStep === 'summary' ? 'bg-primary-600' : 'bg-gray-300'}`} />
            <span className={currentStep === 'address' || currentStep === 'payment' || currentStep === 'summary' ? 'text-primary-600 font-bold' : 'text-gray-500'}>Adresse</span>
            
            <ChevronRight size={16} className="text-gray-400" />
            
            <div className={`h-2 flex-1 rounded-full ${currentStep === 'payment' || currentStep === 'summary' ? 'bg-primary-600' : 'bg-gray-300'}`} />
            <span className={currentStep === 'payment' || currentStep === 'summary' ? 'text-primary-600 font-bold' : 'text-gray-500'}>Zahlung</span>
            
            <ChevronRight size={16} className="text-gray-400" />
            
            <div className={`h-2 flex-1 rounded-full ${currentStep === 'summary' ? 'bg-primary-600' : 'bg-gray-300'}`} />
            <span className={currentStep === 'summary' ? 'text-primary-600 font-bold' : 'text-gray-500'}>Bestätigung</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Address */}
              {(currentStep === 'address' || currentStep === 'payment' || currentStep === 'summary') && (
                <div className={`bg-white rounded-lg border p-6 ${currentStep === 'address' ? 'border-primary-600 shadow-lg' : 'border-gray-200'}`}>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${currentStep === 'address' ? 'bg-primary-600' : 'bg-green-500'}`}>
                      {currentStep === 'address' ? '1' : '✓'}
                    </span>
                    Versandadresse
                  </h2>

                  {currentStep === 'address' && (
                    <div className="space-y-4">
                      <AddressForm
                        value={state.address || { name: '', phone: '', street: '', city: '', region: '' }}
                        onChange={handleAddressChange}
                        onSaveAddress={handleSaveAddress}
                        saveAddressFlag={state.saveAddressFlag}
                      />

                      {state.shippingError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                          <AlertCircle size={16} />
                          {state.shippingError}
                        </div>
                      )}

                      <button
                        onClick={() => canProceedToPayment && setCurrentStep('payment')}
                        disabled={!canProceedToPayment}
                        className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        Weiter zur Zahlung
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}

                  {(currentStep === 'payment' || currentStep === 'summary') && (
                    <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
                      <p><strong>{state.address?.name}</strong></p>
                      <p>{state.address?.street}</p>
                      <p>{state.address?.city} {state.address?.region}</p>
                      <p>{state.address?.phone}</p>
                      <button
                        onClick={() => setCurrentStep('address')}
                        className="text-primary-600 hover:underline mt-2 text-xs"
                      >
                        Ändern
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Payment */}
              {(currentStep === 'payment' || currentStep === 'summary') && (
                <div className={`bg-white rounded-lg border p-6 ${currentStep === 'payment' ? 'border-primary-600 shadow-lg' : 'border-gray-200'}`}>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${currentStep === 'payment' ? 'bg-primary-600' : 'bg-green-500'}`}>
                      {currentStep === 'payment' ? '2' : '✓'}
                    </span>
                    Zahlungsmethode
                  </h2>

                  {currentStep === 'payment' && (
                    <div className="space-y-4">
                      <PaymentMethod
                        value={state.paymentMethod}
                        onChange={handlePaymentChange}
                      />

                      <div className="flex gap-3">
                        <button
                          onClick={() => setCurrentStep('address')}
                          className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300"
                        >
                          Zurück
                        </button>
                        <button
                          onClick={() => setCurrentStep('summary')}
                          className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 flex items-center justify-center gap-2"
                        >
                          Zur Bestätigung
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStep === 'summary' && (
                    <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
                      <p><strong>
                        {state.paymentMethod === 'cod' ? '💰 Nachnahme (COD)' : '🏦 Banküberweisung'}
                      </strong></p>
                      <button
                        onClick={() => setCurrentStep('payment')}
                        className="text-primary-600 hover:underline mt-2 text-xs"
                      >
                        Ändern
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Summary */}
              {currentStep === 'summary' && (
                <div className="bg-white rounded-lg border border-primary-600 p-6 shadow-lg">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white bg-primary-600">
                      3
                    </span>
                    Bestellung bestätigen
                  </h2>

                  <OrderSummary
                    items={items}
                    city={state.address?.city || ''}
                    shippingCost={state.shippingCost}
                    loadingShipping={state.loadingShipping}
                    shippingError={state.shippingError || undefined}
                    onAgreed={handleAgreedToTerms}
                    agreedToTerms={state.agreedToTerms}
                  />

                  {state.orderError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle size={16} />
                      {state.orderError}
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => setCurrentStep('payment')}
                      className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300"
                    >
                      Zurück
                    </button>
                    <button
                      onClick={handleCreateOrder}
                      disabled={!canCreateOrder}
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Bestellung abschließen
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar: Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
                <h3 className="text-lg font-bold mb-4">📋 Bestellsummary</h3>

                <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                  {items.map(item => (
                    <div key={item.product.id} className="flex gap-3 text-sm">
                      {item.product.thumbnailUrl && (
                        <img 
                          src={item.product.thumbnailUrl}
                          alt={item.product.title}
                          className="w-12 h-12 rounded bg-gray-100 object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium line-clamp-2">{item.product.title}</p>
                        <p className="text-gray-600">{item.quantity}x</p>
                      </div>
                      <p className="font-semibold text-right">{(item.product.priceAmount * item.quantity).toLocaleString('de-DE')} SYP</p>
                    </div>
                  ))}
                </div>

                <hr className="my-4" />

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span>Summe:</span>
                    <span className="font-semibold">{items.reduce((sum, item) => sum + (item.product.priceAmount * item.quantity), 0).toLocaleString('de-DE')} SYP</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Versand:</span>
                    <span className="font-semibold">{state.loadingShipping ? '...' : (state.shippingCost.toLocaleString('de-DE') + ' SYP')}</span>
                  </div>
                </div>

                <div className="pt-4 border-t-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Gesamt:</span>
                    <span className="text-primary-600">
                      {(items.reduce((sum, item) => sum + (item.product.priceAmount * item.quantity), 0) + state.shippingCost).toLocaleString('de-DE')} SYP
                    </span>
                  </div>
                </div>

                {/* Continue Shopping Link */}
                <Link href="/browse" className="block mt-6 text-center text-primary-600 hover:underline text-sm">
                  Weiter shoppen
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
