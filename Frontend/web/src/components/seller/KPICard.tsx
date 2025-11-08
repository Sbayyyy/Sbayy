// components/seller/KPICard.tsx
interface KPICardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
}

export default function KPICard({ 
  title, 
  value, 
  change, 
  icon, 
  iconBgColor, 
  iconColor 
}: KPICardProps) {
  const isPositive = change >= 0;
  
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          <div className="flex items-center gap-1 mt-2">
            <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(change)}%
            </span>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
    </div>
  );
}