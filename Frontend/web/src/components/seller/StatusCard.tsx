// components/seller/StatusCard.tsx
interface StatusCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  percentage?: number;
}

export default function StatusCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  iconBgColor, 
  iconColor,
  percentage 
}: StatusCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
      <h3 className="text-sm text-gray-600 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm text-gray-500">{subtitle}</p>
        {percentage !== undefined && (
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full" 
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
