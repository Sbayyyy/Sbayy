// components/seller/SalesChart.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { WeeklySales } from '@sbay/shared';
import { useTranslation } from 'next-i18next';

interface SalesChartProps {
  data: WeeklySales[];
}

export default function SalesChart({ data }: SalesChartProps) {
  const { t } = useTranslation('common');

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('salesChart.title')}</h3>
        <p className="text-sm text-gray-500">{t('salesChart.subtitle')}</p>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="week"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px'
            }}
            formatter={(value) => {
              const num = typeof value === 'number' ? value : 0;
              return [`${num.toLocaleString()} ل.س`, t('salesChart.tooltipLabel')];
            }}
          />
          <Bar
            dataKey="sales"
            fill="#7c3aed"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
