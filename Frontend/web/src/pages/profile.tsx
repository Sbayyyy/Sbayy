import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { getCurrentUser, updateProfile, UpdateProfileRequest } from '@/lib/api/users';
import { Mail, Phone, MapPin, Calendar, Edit2, Save, X, User as UserIcon } from 'lucide-react';
import { User } from '@sbay/shared';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    region: user?.region || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data from backend
  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated) return;
      
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        setFormData({
          displayName: userData.displayName || '',
          email: userData.email || '',
          phone: userData.phone || '',
          region: userData.region || '',
        });
      } catch (error) {
        console.error('Error loading user data:', error);
        toast.error('حدث خطأ أثناء تحميل البيانات');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [isAuthenticated, setUser]);

  // Redirect if not authenticated
   if (!isAuthenticated) {
     if (typeof window !== 'undefined') {
       router.push('/auth/login?redirect=/profile');
     }
     return null;
   }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData: UpdateProfileRequest = {
        displayName: formData.displayName,
        phone: formData.phone,
      };
      
      const updatedUser = await updateProfile(updateData);
      
      // Update AuthStore with new data
      setUser(updatedUser);
      
      setIsEditing(false);
      toast.success('تم حفظ التغييرات بنجاح');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('حدث خطأ أثناء حفظ التغييرات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      displayName: user?.displayName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      region: user?.region || '',
    });
    setIsEditing(false);
  };

  return (
    <>
      <Head>
        <title>الملف الشخصي - سباي</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-bold text-3xl">
                    {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{user?.displayName || 'مستخدم'}</h1>
                  <p className="text-gray-500 flex items-center gap-2 mt-1">
                    <Mail size={16} />
                    {user?.email || ''}
                  </p>
                </div>
              </div>
              
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Edit2 size={18} />
                  تعديل الملف
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Save size={18} />
                    {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <X size={18} />
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Profile Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">المعلومات الشخصية</h2>
            
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <UserIcon size={16} className="inline ml-2" />
                  الاسم
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 px-4 py-2 bg-gray-50 rounded-lg">{user?.displayName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail size={16} className="inline ml-2" />
                  البريد الإلكتروني
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 px-4 py-2 bg-gray-50 rounded-lg">{user?.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone size={16} className="inline ml-2" />
                  رقم الهاتف
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="مثال: 0912345678"
                  />
                ) : (
                  <p className="text-gray-900 px-4 py-2 bg-gray-50 rounded-lg">
                    {user?.phone || 'لم يتم تحديد رقم الهاتف'}
                  </p>
                )}
              </div>

              {/* Location */}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin size={16} className="inline ml-2" />
                  المدينة
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="مثال: دمشق"
                  />
                ) : (
                  <p className="text-gray-900 px-4 py-2 bg-gray-50 rounded-lg">
                    {user?.region || 'لم يتم تحديد المدينة'}
                  </p>
                )}
              </div>
              
              {/* Member Since */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} className="inline ml-2" />
                  عضو منذ
                </label>
                <p className="text-gray-900 px-4 py-2 bg-gray-50 rounded-lg">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('ar-SY', { year: 'numeric', month: 'long' })
                    : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Account Statistics */}
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">إحصائيات الحساب</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">0</p>
                <p className="text-sm text-gray-600 mt-1">إعلانات نشطة</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">0</p>
                <p className="text-sm text-gray-600 mt-1">مبيعات</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">0</p>
                <p className="text-sm text-gray-600 mt-1">مشتريات</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">5.0</p>
                <p className="text-sm text-gray-600 mt-1">التقييم</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
