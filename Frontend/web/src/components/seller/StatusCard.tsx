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
    <div className="surface-card surface-card-hover p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${iconBgColor}`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
      <h3 className="text-sm font-medium text-slate-500 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-slate-950 mb-2">{value}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm text-slate-500">{subtitle}</p>
        {percentage !== undefined && (
          <div className="flex-1">
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
