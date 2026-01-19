import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { User, Lock, Shield, Eye, EyeOff, ChevronRight } from 'lucide-react';

import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { changePassword } from '@/lib/api/auth';
import { getCurrentUser, updateProfile, UpdateProfileRequest } from '@/lib/api/users';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { defaultTextInputValidator, loadProfanityListFromUrl, sanitizeInput } from '@sbay/shared';

const Toggle = ({
  checked,
  onChange,
  disabled = false
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) => (
  <label
    className={`relative inline-flex items-center ${
      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
    }`}
  >
    <input
      type="checkbox"
      className="sr-only"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
    />
    <span
      className={`w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    />
    <span
      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </label>
);

export default function AccountSettingsPage() {
  useRequireAuth();
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('personal');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{ firstName?: string; lastName?: string; phone?: string; username?: string }>({});
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    bio: '',
    avatar: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: ''
  });

  const [emailNotifications, setEmailNotifications] = useState({
    newBids: true,
    outbid: true,
    wonAuction: true,
    messages: true,
    promotions: false,
    priceDrops: true,
  });

  const [pushNotifications, setPushNotifications] = useState({
    newBids: true,
    outbid: true,
    wonAuction: true,
    messages: false,
  });
  const notificationsComingSoon = true;
  const privacyComingSoon = true;

  const handleSave = (section: string) => {
    toast.success(`${section} settings updated successfully`);
  };

  const splitName = useCallback(() => {
    return {
      firstName: '',
      lastName: ''
    };
  }, []);

  const combinedName = useMemo(() => {
    return profileForm.username.trim();
  }, [profileForm.username]);

  const loadProfile = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      const { firstName, lastName } = splitName();
      setProfileForm((prev) => ({
        ...prev,
        firstName,
        lastName,
        email: userData.email ?? '',
        phone: userData.phone ?? '',
        username: userData.name ?? '',
        avatar: userData.avatar ?? ''
      }));
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Unable to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [setUser, splitName]);

  useEffect(() => {
    void loadProfanityListFromUrl('/profanities.txt');
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const updateField = (field: 'firstName' | 'lastName' | 'phone' | 'bio' | 'username') => (value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'phone' || field === 'username') {
      const validation = defaultTextInputValidator.validate(value);
      setFormErrors((prev) => ({
        ...prev,
        [field]: validation.isValid ? undefined : validation.message ?? 'Input contains disallowed content'
      }));
    }
  };

  const resetForm = useCallback(() => {
    const { firstName, lastName } = splitName();
    setProfileForm((prev) => ({
      ...prev,
      firstName,
      lastName,
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      username: user?.name ?? '',
      avatar: user?.avatar ?? ''
    }));
    setFormErrors({});
  }, [splitName, user?.avatar, user?.email, user?.name, user?.phone]);

  const handleProfileSave = async () => {
    const nameValue = combinedName;
    const nameValidation = defaultTextInputValidator.validate(nameValue);
    const phoneValidation = defaultTextInputValidator.validate(profileForm.phone);
    const nextErrors: typeof formErrors = {};

    if (!nameValidation.isValid) {
      nextErrors.username = nameValidation.message ?? 'Input contains disallowed content';
    }
    if (profileForm.phone && !phoneValidation.isValid) {
      nextErrors.phone = phoneValidation.message ?? 'Input contains disallowed content';
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      const updateData: UpdateProfileRequest = {
        displayName: sanitizeInput(nameValue),
        phone: profileForm.phone ? sanitizeInput(profileForm.phone) : undefined,
        avatar: profileForm.avatar || undefined
      };
      const updatedUser = await updateProfile(updateData);
      setUser(updatedUser);
      toast.success('Personal settings updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Unable to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('files', file);
      const response = await api.post<{ urls: string[] }>('/uploads/images', formDataUpload);
      const url = response.data.urls?.[0];
      if (!url) throw new Error('Upload failed');
      setProfileForm((prev) => ({ ...prev, avatar: url }));
      toast.success('Avatar updated');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Unable to upload avatar');
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  };

  const updatePasswordField = (field: 'current' | 'next' | 'confirm') => (value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    setPasswordErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handlePasswordSave = async () => {
    const nextErrors: typeof passwordErrors = {};
    if (!passwordForm.current.trim()) nextErrors.current = 'Current password is required';
    if (!passwordForm.next.trim()) nextErrors.next = 'New password is required';
    if (passwordForm.next && passwordForm.next.length < 8) nextErrors.next = 'Password must be at least 8 characters';
    if (passwordForm.next !== passwordForm.confirm) nextErrors.confirm = 'Passwords do not match';

    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPasswordSaving(true);
    try {
      await changePassword(passwordForm.current, passwordForm.next);
      setPasswordForm({ current: '', next: '', confirm: '' });
      toast.success('Password updated successfully');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Unable to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Account Settings</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="mb-8">
            <Link href="/profile" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
              &larr; Back to Profile
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Account Settings</h1>
            <p className="text-gray-600">Manage your account preferences and security settings</p>
          </div>

          <div className="w-full">
            <div className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8 bg-white border border-gray-200 rounded-lg overflow-hidden">
              {[
                { id: 'personal', label: 'Personal' },
                { id: 'security', label: 'Security' },
                { id: 'notifications', label: 'Notifications' },
                { id: 'privacy', label: 'Privacy' },
                // { id: 'payment', label: 'Payment' },
                // { id: 'shipping', label: 'Shipping' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'personal' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h2>
                {isLoading ? (
                  <div className="py-12 text-center text-sm text-gray-500">Loading profile...</div>
                ) : (
                <div>
                <div className="mb-8">
                  <label className="mb-3 block text-sm font-medium text-gray-700">Profile Photo</label>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                      {profileForm.avatar ? (
                        <img src={profileForm.avatar} alt={combinedName || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-semibold text-gray-500">
                          {(combinedName || user?.name || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <input
                        id="avatarUpload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="avatarUpload"
                        className="mb-2 inline-flex px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 cursor-pointer"
                      >
                        {avatarUploading ? 'Uploading...' : 'Upload New Photo'}
                      </label>
                      <p className="text-xs text-gray-600">JPG, PNG or GIF. Max size 5MB.</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name</label>
                    <input
                      id="firstName"
                      value={profileForm.firstName}
                      disabled
                      className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Coming soon</p>
                  </div>
                  <div>
                    <label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      id="lastName"
                      value={profileForm.lastName}
                      disabled
                      className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Coming soon</p>
                  </div>
                  <div>
                    <label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-600 mt-1">Verified</p>
                  </div>
                  <div>
                    <label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</label>
                    <input
                      id="phone"
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => updateField('phone')(e.target.value)}
                      className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                    {formErrors.phone && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="username" className="text-sm font-medium text-gray-700">Username</label>
                    <input
                      id="username"
                      value={profileForm.username}
                      onChange={(e) => updateField('username')(e.target.value)}
                      className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                    {formErrors.username && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.username}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="language" className="text-sm font-medium text-gray-700">Language</label>
                    <select id="language" defaultValue="en" disabled className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500">
                      <option value="en">English</option>
                      <option value="es">Espanol</option>
                      <option value="fr">Francais</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 mt-6">
                  <label htmlFor="bio" className="text-sm font-medium text-gray-700">Bio</label>
                  <textarea
                    id="bio"
                    className="w-full mt-2 p-3 border border-gray-300 rounded-md min-h-[100px] resize-none"
                    value={profileForm.bio}
                    onChange={(e) => updateField('bio')(e.target.value)}
                    disabled
                    placeholder="Tell buyers about yourself..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Coming soon</p>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                    onClick={resetForm}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProfileSave}
                    className="px-4 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
                </div>
                )}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Password & Authentication</h2>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">Current Password</label>
                      <div className="relative mt-2">
                        <input
                          id="currentPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter current password"
                          value={passwordForm.current}
                          onChange={(e) => updatePasswordField('current')(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordErrors.current && (
                        <p className="text-xs text-red-500 mt-1">{passwordErrors.current}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">New Password</label>
                      <input
                        id="newPassword"
                        type="password"
                        placeholder="Enter new password"
                        value={passwordForm.next}
                        onChange={(e) => updatePasswordField('next')(e.target.value)}
                        className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                      {passwordErrors.next ? (
                        <p className="text-xs text-red-500 mt-1">{passwordErrors.next}</p>
                      ) : (
                        <p className="text-xs text-gray-600 mt-1">Must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm New Password</label>
                      <input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm new password"
                        value={passwordForm.confirm}
                        onChange={(e) => updatePasswordField('confirm')(e.target.value)}
                        className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                      {passwordErrors.confirm && (
                        <p className="text-xs text-red-500 mt-1">{passwordErrors.confirm}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                      onClick={() => setPasswordForm({ current: '', next: '', confirm: '' })}
                      disabled={passwordSaving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePasswordSave}
                      className="px-4 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                      disabled={passwordSaving}
                    >
                      {passwordSaving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">Two-Factor Authentication</h2>
                      <p className="text-sm text-gray-600">Add an extra layer of security to your account (coming soon).</p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                      Coming soon
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Authenticator App</p>
                          <p className="text-sm text-gray-600">Use an app to generate codes</p>
                        </div>
                      </div>
                      <Toggle checked={twoFactorEnabled} onChange={setTwoFactorEnabled} disabled />
                    </div>

                    {twoFactorEnabled && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900">
                          Your account is protected with 2FA. You will need to enter a code from your authenticator app when signing in.
                        </p>
                        <button className="text-blue-600 text-sm mt-2" disabled>
                          View backup codes
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">Active Sessions</h2>
                      <p className="text-sm text-gray-600">Session management is being implemented.</p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                      Coming soon
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium mb-1">Chrome on MacBook Pro</p>
                        <p className="text-sm text-gray-600">San Francisco, CA · Last active now</p>
                        <span className="inline-flex items-center mt-2 px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full">
                          Current Session
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium mb-1">Safari on iPhone 15</p>
                        <p className="text-sm text-gray-600">San Francisco, CA · Last active 2 hours ago</p>
                      </div>
                      <button className="px-3 py-1 border border-gray-300 rounded-md text-sm text-red-600 opacity-60 cursor-not-allowed" disabled>
                        Revoke
                      </button>
                    </div>
                  </div>
                  <button className="w-full mt-4 text-red-600 text-sm border border-red-200 rounded-md py-2 opacity-60 cursor-not-allowed" disabled>
                    Sign out of all other sessions
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                  <span>Notifications settings are coming soon.</span>
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Coming soon</span>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Email Notifications</h2>
                  <div className="space-y-4">
                    {[
                      {
                        key: 'newBids',
                        title: 'New bids on my items',
                        description: 'Get notified when someone bids on your listings'
                      },
                      {
                        key: 'outbid',
                        title: 'Outbid alerts',
                        description: "When you've been outbid on an item"
                      },
                      {
                        key: 'wonAuction',
                        title: 'Won auctions',
                        description: 'When you win an auction'
                      },
                      {
                        key: 'messages',
                        title: 'Messages',
                        description: 'When you receive a new message from buyers or sellers'
                      },
                      {
                        key: 'priceDrops',
                        title: 'Price drops on watched items',
                        description: 'When items in your watchlist drop in price'
                      },
                      {
                        key: 'promotions',
                        title: 'Promotional emails',
                        description: 'Deals, recommendations, and marketing emails'
                      }
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                        <Toggle
                          checked={emailNotifications[item.key as keyof typeof emailNotifications]}
                          onChange={(checked) =>
                            setEmailNotifications({ ...emailNotifications, [item.key]: checked })
                          }
                          disabled={notificationsComingSoon}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => handleSave('Email notification')}
                      className="px-4 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                      disabled={notificationsComingSoon}
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Push Notifications</h2>
                  <div className="space-y-4">
                    {[
                      {
                        key: 'newBids',
                        title: 'New bids',
                        description: 'Mobile push notifications for new bids'
                      },
                      {
                        key: 'outbid',
                        title: 'Outbid alerts',
                        description: 'Instant alerts when outbid'
                      },
                      {
                        key: 'wonAuction',
                        title: 'Won auctions',
                        description: 'Celebrate your wins instantly'
                      },
                      {
                        key: 'messages',
                        title: 'Messages',
                        description: 'New message notifications'
                      }
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                        <Toggle
                          checked={pushNotifications[item.key as keyof typeof pushNotifications]}
                          onChange={(checked) =>
                            setPushNotifications({ ...pushNotifications, [item.key]: checked })
                          }
                          disabled={notificationsComingSoon}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => handleSave('Push notification')}
                      className="px-4 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                      disabled={notificationsComingSoon}
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/*
            {activeTab === 'payment' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
                    <button className="px-4 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700">
                      Add Payment Method
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">Visa ending in 4242</p>
                            <span className="text-xs px-2 py-1 border rounded bg-white">Default</span>
                          </div>
                          <p className="text-sm text-gray-600">Expires 12/2026</p>
                          <p className="text-sm text-gray-600 mt-1">John Doe</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 text-sm">Edit</button>
                        <button className="px-3 py-1 text-sm text-red-600">Remove</button>
                      </div>
                    </div>

                    <div className="flex items-start justify-between p-4 border rounded-lg hover:border-gray-300 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-medium mb-1">Mastercard ending in 8888</p>
                          <p className="text-sm text-gray-600">Expires 09/2025</p>
                          <p className="text-sm text-gray-600 mt-1">John Doe</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 text-sm border rounded">Set as Default</button>
                        <button className="px-3 py-1 text-sm">Edit</button>
                        <button className="px-3 py-1 text-sm text-red-600">Remove</button>
                      </div>
                    </div>

                    <div className="flex items-start justify-between p-4 border rounded-lg hover:border-gray-300 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-500 rounded flex items-center justify-center">
                          <Globe className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-medium mb-1">PayPal</p>
                          <p className="text-sm text-gray-600">john.doe@email.com</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 text-sm border rounded">Set as Default</button>
                        <button className="px-3 py-1 text-sm text-red-600">Remove</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Billing Address</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label htmlFor="address" className="text-sm font-medium text-gray-700">Street Address</label>
                      <input id="address" defaultValue="123 Market Street" className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label htmlFor="city" className="text-sm font-medium text-gray-700">City</label>
                      <input id="city" defaultValue="San Francisco" className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label htmlFor="state" className="text-sm font-medium text-gray-700">State / Province</label>
                      <input id="state" defaultValue="CA" className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label htmlFor="zip" className="text-sm font-medium text-gray-700">ZIP / Postal Code</label>
                      <input id="zip" defaultValue="94102" className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label htmlFor="country" className="text-sm font-medium text-gray-700">Country</label>
                      <select id="country" defaultValue="us" className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2">
                        <option value="us">United States</option>
                        <option value="ca">Canada</option>
                        <option value="uk">United Kingdom</option>
                        <option value="au">Australia</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button className="px-4 py-2 border border-gray-300 rounded-md text-sm">Cancel</button>
                    <button
                      onClick={() => handleSave('Billing address')}
                      className="px-4 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Save Address
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Shipping Addresses</h2>
                  <button className="px-4 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700">
                    Add New Address
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">Home</span>
                        <span className="text-xs px-2 py-1 border rounded bg-white">Default</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 space-y-1 mb-4">
                      <p>John Doe</p>
                      <p>123 Market Street</p>
                      <p>San Francisco, CA 94102</p>
                      <p>United States</p>
                      <p className="mt-2">+1 (555) 123-4567</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 text-sm">Edit</button>
                      <button className="px-3 py-1 text-sm text-red-600">Remove</button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <span className="font-medium">Work</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 space-y-1 mb-4">
                      <p>John Doe</p>
                      <p>456 Tech Plaza, Suite 300</p>
                      <p>San Francisco, CA 94103</p>
                      <p>United States</p>
                      <p className="mt-2">+1 (555) 987-6543</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 text-sm border rounded">Set as Default</button>
                      <button className="px-3 py-1 text-sm">Edit</button>
                      <button className="px-3 py-1 text-sm text-red-600">Remove</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            */}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                  <span>Privacy controls are coming soon.</span>
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Coming soon</span>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Visibility</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Public profile</p>
                        <p className="text-sm text-gray-600">Allow others to view your profile and listings</p>
                      </div>
                      <Toggle checked={true} onChange={() => {}} disabled={privacyComingSoon} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show email address</p>
                        <p className="text-sm text-gray-600">Display your email on your public profile</p>
                      </div>
                      <Toggle checked={false} onChange={() => {}} disabled={privacyComingSoon} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show phone number</p>
                        <p className="text-sm text-gray-600">Display your phone number on your public profile</p>
                      </div>
                      <Toggle checked={false} onChange={() => {}} disabled={privacyComingSoon} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show purchase history</p>
                        <p className="text-sm text-gray-600">Let others see items you have purchased</p>
                      </div>
                      <Toggle checked={false} onChange={() => {}} disabled={privacyComingSoon} />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Data & Privacy</h2>
                  <div className="space-y-4">
                    <button className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 text-sm opacity-60 cursor-not-allowed" disabled>
                      <span className="flex items-center gap-3">
                        <User className="w-5 h-5" />
                        Download your data
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 text-sm opacity-60 cursor-not-allowed" disabled>
                      <span className="flex items-center gap-3">
                        <Shield className="w-5 h-5" />
                        Privacy policy
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 text-sm opacity-60 cursor-not-allowed" disabled>
                      <span className="flex items-center gap-3">
                        <Lock className="w-5 h-5" />
                        Terms of service
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Blocked Users</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Users you have blocked will not be able to contact you or bid on your items.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg opacity-60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-500">AB</span>
                        </div>
                        <div>
                          <p className="font-medium">blocked_user_123</p>
                          <p className="text-xs text-gray-600">Blocked 2 weeks ago</p>
                        </div>
                      </div>
                      <button className="px-3 py-1 text-sm border rounded cursor-not-allowed" disabled>Unblock</button>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-6 opacity-60">
                  <h2 className="text-lg font-semibold text-red-900 mb-6">Danger Zone</h2>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-red-900">Deactivate account</p>
                        <p className="text-sm text-red-700">Temporarily disable your account. You can reactivate it anytime.</p>
                      </div>
                      <button className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded cursor-not-allowed" disabled>
                        Deactivate
                      </button>
                    </div>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-red-900">Delete account</p>
                        <p className="text-sm text-red-700">Permanently delete your account and all data. This cannot be undone.</p>
                      </div>
                      <button className="px-3 py-1 text-sm border border-red-600 text-red-600 rounded cursor-not-allowed" disabled>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common'])),
    },
  };
}
