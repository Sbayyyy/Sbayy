import { Shield, Package } from 'lucide-react';

interface TrustBadgesProps {
  safeLabel: string;
  shippingLabel: string;
  qualityLabel: string;
}

export default function TrustBadges({ safeLabel, shippingLabel, qualityLabel }: TrustBadgesProps) {
  return (
    <div className="mt-6 grid grid-cols-3 gap-3 text-center">
      <div className="soft-panel p-3">
        <Shield className="mx-auto mb-2 text-emerald-600" size={22} />
        <p className="text-xs font-medium text-slate-600">{safeLabel}</p>
      </div>
      <div className="soft-panel p-3">
        <Package className="mx-auto mb-2 text-primary-600" size={22} />
        <p className="text-xs font-medium text-slate-600">{shippingLabel}</p>
      </div>
      <div className="soft-panel p-3">
        <Shield className="mx-auto mb-2 text-primary-600" size={22} />
        <p className="text-xs font-medium text-slate-600">{qualityLabel}</p>
      </div>
    </div>
  );
}
