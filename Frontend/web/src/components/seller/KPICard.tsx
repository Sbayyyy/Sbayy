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
    <div className="surface-card surface-card-hover p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold text-slate-950">{value}</h3>
          <div className="mt-2 flex items-center gap-1">
            <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {isPositive ? '+' : '-'}{Math.abs(change)}%
            </span>
          </div>
        </div>
        <div className={`rounded-2xl p-3 ${iconBgColor}`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
    </div>
  );
}
