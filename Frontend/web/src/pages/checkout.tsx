import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Layout from '@/components/Layout';
import AddressForm from '@/components/checkout/AddressForm';
import PaymentMethod from '@/components/checkout/PaymentMethod';
import OrderSummary from '@/components/checkout/OrderSummary';
import { useCartStore } from '@/lib/cartStore';
import { createOrder, calculateShipping } from '../lib/api/orders';
import { getMyAddresses } from '@/lib/api/addresses';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { validateAddress, isAddressValid } from '@sbay/shared';
import type { Address, OrderCreate, SavedAddress } from '@sbay/shared';
import Link from 'next/link';
import { 
  ChevronLeft, Check, Shield, Award, Truck, MapPin, 
  CreditCard, Package, AlertCircle, Loader2
} from 'lucide-react';

type CheckoutStep = 'delivery' | 'payment' | 'review';

interface CheckoutState {
  address: Address;
  selectedAddressId: string;
  paymentMethod: 'cod' | 'bank_transfer' | 'meet_in_person';
  shippingCost: number;
  agreedToTerms: boolean;
  orderError: string | null;
  addressErrors: Record<string, string>;
}

/**
 * Modern Checkout Page - Redesigned
 * 
 * Inspired by Seller Dashboard style:
 * - Clean card-based layout
 * - 2-column with sticky sidebar
 * - Progress steps with checkmarks
 * - Trust badges
 */
export default function CheckoutPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const isAuthed = useRequireAuth();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('delivery');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [state, setState] = useState<CheckoutState>({
    address: {
      name: '',
      phone: '',
      street: '',
      city: '',
      region: ''
    },
    selectedAddressId: '',
    paymentMethod: 'cod',
    shippingCost: 0,
    agreedToTerms: false,
    orderError: null,
    addressErrors: {}
  });

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['savedAddresses'],
    queryFn: getMyAddresses,
    enabled: isAuthed,
  });

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [items, router]);

  const handleCalculateShipping = useCallback(async (city: string) => {
    try {
      const shipping = await calculateShipping({ city });
      setState(prev => ({ ...prev, shippingCost: shipping.cost }));
    } catch (error) {
      console.error('Error calculating shipping:', error);
      setState(prev => ({ 
        ...prev, 
        shippingCost: 5000 // Fallback
      }));
    }
  }, []);

  // Calculate shipping when city changes
  useEffect(() => {
    const city = state.selectedAddressId 
      ? savedAddresses.find((a: SavedAddress) => a.id === state.selectedAddressId)?.city
      : state.address.city;
    
    if (city && city.length > 2) {
      handleCalculateShipping(city);
    }
  }, [handleCalculateShipping, state.address.city, state.selectedAddressId, savedAddresses]);

  const handlePlaceOrder = async () => {
    if (!state.agreedToTerms) {
      alert(t('checkout.pleaseAgreeTerms'));
      return;
    }

    try {
      setIsSubmitting(true);
      setState(prev => ({ ...prev, orderError: null }));

      const orderData: OrderCreate = {
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.priceAmount
        })),
        paymentMethod: state.paymentMethod,
        // Either use saved address OR new address
        ...(state.selectedAddressId 
          ? { savedAddressId: state.selectedAddressId }
          : { newAddress: state.address }
        )
      };

      const order = await createOrder(orderData);
      clearCart();
      router.push(`/order-confirmation?orderId=${order.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      setState(prev => ({ 
        ...prev, 
        orderError: t('checkout.orderError')
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.product.priceAmount * item.quantity), 0);
  const total = subtotal + state.shippingCost;

  // Validation
  const isDeliveryValid = state.selectedAddressId || 
    (state.address.name && state.address.phone && state.address.city && state.address.street);
  const isPaymentValid = state.paymentMethod;
  const isReviewValid = isDeliveryValid && isPaymentValid && state.agreedToTerms;

  const steps = [
    { id: 'review' as CheckoutStep, label: t('checkout.steps.review'), icon: Package, isComplete: false },
    { id: 'payment' as CheckoutStep, label: t('checkout.steps.payment'), icon: CreditCard, isComplete: currentStep === 'review' },
    { id: 'delivery' as CheckoutStep, label: t('checkout.steps.delivery'), icon: MapPin, isComplete: currentStep === 'payment' || currentStep === 'review' }
  ];

  if (items.length === 0) {
    return null; // Will redirect
  }
  if (!isAuthed) {
    return null;
  }

  return (
    <Layout title={t('checkout.pageTitle')}>
      <div className="bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <Link href="/cart" className="inline-flex items-center text-gray-600 hover:text-gray-900">
              <ChevronLeft size={20} />
              <span className="ml-1">{t('checkout.pageTitle')}</span>
            </Link>
          </div>
        </div>

        {/* Progress Steps - RTL */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-center gap-16 max-w-2xl mx-auto" dir="rtl">
              {steps.map((step) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors ${
                    step.isComplete 
                      ? 'bg-blue-600 text-white' 
                      : currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step.isComplete ? (
                      <Check size={20} />
                    ) : (
                      <step.icon size={20} />
                    )}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    currentStep === step.id ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* DELIVERY STEP */}
              {currentStep === 'delivery' && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h2 className="text-xl font-bold mb-6">{t('checkout.address.title')}</h2>
                  
                  {/* Saved Addresses Dropdown */}
                  {savedAddresses.length > 0 && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('checkout.address.selectSaved')}
                      </label>
                      <select
                        value={state.selectedAddressId}
                        onChange={(e) => {
                          const addressId = e.target.value;
                          setState(prev => ({ ...prev, selectedAddressId: addressId }));
                          
                          // Clear new address form if saved address is selected
                          if (addressId) {
                            setState(prev => ({ 
                              ...prev, 
                              address: { name: '', phone: '', street: '', city: '', region: '' }
                            }));
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">{t('checkout.address.newAddress')}</option>
                        {savedAddresses.map((addr: SavedAddress) => (
                          <option key={addr.id} value={addr.id}>
                            {addr.name} - {addr.city}, {addr.street}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Show address form only if no saved address is selected */}
                  {!state.selectedAddressId && (
                    <AddressForm
                      value={state.address}
                      onChange={(address) => setState(prev => ({ ...prev, address }))}
                      saveAddressFlag={false}
                      errors={state.addressErrors}
                    />
                  )}

                  {/* Show selected address info */}
                  {state.selectedAddressId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      {(() => {
                        const selected = savedAddresses.find((a: SavedAddress) => a.id === state.selectedAddressId);
                        return selected ? (
                          <div>
                            <p className="font-medium">{selected.name}</p>
                            <p className="text-sm text-gray-700">{selected.phone}</p>
                            <p className="text-sm text-gray-700">{selected.street}</p>
                            <p className="text-sm text-gray-700">{selected.city}{selected.region ? `, ${selected.region}` : ''}</p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      // Validate address before proceeding
                      if (!state.selectedAddressId) {
                        const errors = validateAddress(state.address);
                        if (Object.keys(errors).length > 0) {
                          setState(prev => ({ ...prev, addressErrors: errors }));
                          return;
                        }
                      }
                      setState(prev => ({ ...prev, addressErrors: {} }));
                      setCurrentStep('payment');
                    }}
                    disabled={!isDeliveryValid}
                    className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {t('checkout.nextPayment')}
                    <ChevronLeft className="rotate-180" size={20} />
                  </button>
                </div>
              )}

              {/* PAYMENT STEP */}
              {currentStep === 'payment' && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <PaymentMethod
                    value={state.paymentMethod}
                    onChange={(method) => setState(prev => ({ ...prev, paymentMethod: method }))}
                  />

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => setCurrentStep('delivery')}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200"
                    >
                      {t('checkout.back')}
                    </button>
                    <button
                      onClick={() => setCurrentStep('review')}
                      disabled={!isPaymentValid}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {t('checkout.reviewOrder')}
                      <ChevronLeft className="rotate-180" size={20} />
                    </button>
                  </div>
                </div>
              )}

              {/* REVIEW STEP */}
              {currentStep === 'review' && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <OrderSummary
                    items={items}
                    shippingCost={state.shippingCost}
                    onAgreed={(agreed) => setState(prev => ({ ...prev, agreedToTerms: agreed }))}
                    agreedToTerms={state.agreedToTerms}
                  />

                  {/* Error Message */}
                  {state.orderError && (
                    <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                      <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                      <p className="text-sm text-red-800">{state.orderError}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setCurrentStep('payment')}
                      disabled={isSubmitting}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50"
                    >
                      {t('checkout.back')}
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={!isReviewValid || isSubmitting}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          {t('checkout.placingOrder')}
                        </>
                      ) : (
                        t('checkout.confirmOrder')
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Order Summary (Sticky) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-24">
                <h3 className="text-lg font-bold mb-4">{t('checkout.orderSummary')}</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>{t('checkout.review.subtotal')} ({items.length} {t('checkout.products')})</span>
                    <span>{subtotal.toLocaleString()} ل.س</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>{t('checkout.deliveryFees')}</span>
                    <span>{state.shippingCost.toLocaleString()} ل.س</span>
                  </div>
                  <div className="pt-3 border-t flex justify-between text-lg font-bold">
                    <span>{t('checkout.review.total')}</span>
                    <span className="text-blue-600">{total.toLocaleString()} ل.س</span>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="space-y-3 pt-6 border-t">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Shield size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{t('checkout.trust.secureTransactions')}</p>
                      <p className="text-gray-600">{t('checkout.trust.infoProtected')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Award size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{t('checkout.trust.guaranteedQuality')}</p>
                      <p className="text-gray-600">{t('checkout.trust.verifiedProducts')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Truck size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{t('checkout.trust.localDelivery')}</p>
                      <p className="text-gray-600">{t('checkout.trust.fastDelivery')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getStaticProps({ locale }: { locale?: string }) {
  return { props: { ...(await serverSideTranslations(locale ?? 'ar', ['common'])) } };
}
