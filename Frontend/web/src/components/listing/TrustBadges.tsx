import { Shield, Package } from 'lucide-react';

interface TrustBadgesProps {
  safeLabel: string;
  shippingLabel: string;
  qualityLabel: string;
}

export default function TrustBadges({ safeLabel, shippingLabel, qualityLabel }: TrustBadgesProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mt-6 text-center">
      <div>
        <Shield className="mx-auto mb-2 text-green-600" size={24} />
        <p className="text-xs text-gray-600">{safeLabel}</p>
      </div>
      <div>
        <Package className="mx-auto mb-2 text-blue-600" size={24} />
        <p className="text-xs text-gray-600">{shippingLabel}</p>
      </div>
      <div>
        <Shield className="mx-auto mb-2 text-primary-600" size={24} />
        <p className="text-xs text-gray-600">{qualityLabel}</p>
      </div>
    </div>
  );
}
