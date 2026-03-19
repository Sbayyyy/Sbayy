import { Package, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'next-i18next';

interface Activity {
  type: 'listing' | 'purchase';
  title: string;
  description: string;
  date: string;
}

interface ProfileOverviewTabProps {
  activities: Activity[];
}

export default function ProfileOverviewTab({ activities }: ProfileOverviewTabProps) {
  const { t } = useTranslation('common');
  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('profile.recentActivity')}
        </h2>
        {activities.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
            {t('profile.activityEmpty')}
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div
                key={`${activity.type}-${index}`}
                className={`flex items-start gap-4 ${index < activities.length - 1 ? 'pb-4 border-b' : ''}`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  activity.type === 'listing' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {activity.type === 'listing' ? (
                    <Package className="w-6 h-6 text-blue-600" />
                  ) : (
                    <ShoppingBag className="w-6 h-6 text-green-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
