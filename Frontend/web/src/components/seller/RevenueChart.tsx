import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DailyRevenue } from '@sbay/shared';
import { useTranslation } from 'next-i18next';
import { formatPrice } from '@/lib/formatters';

interface RevenueChartProps {
  data: DailyRevenue[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const { t } = useTranslation('common');

  return (
    <div className="surface-card p-6">
      <div className="mb-6">
        <h3 className="mb-1 text-lg font-bold text-slate-950">{t('revenueChart.title')}</h3>
        <p className="text-sm text-slate-500">{t('revenueChart.subtitle')}</p>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <YAxis
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
            tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              fontSize: '14px',
              boxShadow: '0 18px 45px -28px rgba(15, 23, 42, 0.35)'
            }}
            formatter={(value) => {
              const num = typeof value === 'number' ? value : 0;
              return [formatPrice(num), t('revenueChart.tooltipLabel')];
            }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ fill: '#2563eb', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
