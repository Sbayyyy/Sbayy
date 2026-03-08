import { useTranslation } from 'next-i18next';
import { CreditCard, Banknote, Users } from 'lucide-react';

interface PaymentMethodProps {
  value: 'cod' | 'bank_transfer' | 'meet_in_person';
  onChange: (method: 'cod' | 'bank_transfer' | 'meet_in_person') => void;
}

/**
 * PaymentMethod Component - Modern Redesign
 * 
 * Clean radio cards layout
 * - 3 Options: COD, Bank Transfer, Meet in Person
 * - Arabic RTL support
 * - Modern styling matching screenshots
 * 
 * TODO (Mo): Real bank details from backend
 * GET /api/payment-methods - returns payment config
 */
export default function PaymentMethod({ value, onChange }: PaymentMethodProps) {
  const { t } = useTranslation('common');

  return (
    <div>
      <h3 className="text-xl font-bold mb-6">{t('checkout.payment.title')}</h3>

      <div className="space-y-3">
        {/* COD - Cash on Delivery */}
        <label 
          className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
            value === 'cod' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="payment"
            value="cod"
            checked={value === 'cod'}
            onChange={() => onChange('cod')}
            className="w-5 h-5 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Banknote size={24} className="text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">{t('checkout.payment.cod')}</h4>
            <p className="text-sm text-gray-600">
              {t('checkout.payment.codDesc')}
            </p>
          </div>
        </label>

        {/* Bank Transfer */}
        <label 
          className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
            value === 'bank_transfer' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="payment"
            value="bank_transfer"
            checked={value === 'bank_transfer'}
            onChange={() => onChange('bank_transfer')}
            className="w-5 h-5 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <CreditCard size={24} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">{t('checkout.payment.bankTransfer')}</h4>
            <p className="text-sm text-gray-600">
              {t('checkout.payment.bankTransferDesc')}
            </p>
          </div>
        </label>

        {/* Meet in Person */}
        <label 
          className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
            value === 'meet_in_person' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="payment"
            value="meet_in_person"
            checked={value === 'meet_in_person'}
            onChange={() => onChange('meet_in_person')}
            className="w-5 h-5 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Users size={24} className="text-purple-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">{t('checkout.payment.meetInPerson')}</h4>
            <p className="text-sm text-gray-600">
              {t('checkout.payment.meetInPersonDesc')}
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
