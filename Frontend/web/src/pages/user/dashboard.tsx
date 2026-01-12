import React from 'react';
import Layout from '@/components/Layout';
export default function SellerDashboard() {
  return (
    <Layout>
      <div className="py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome to your dashboard</h1>
        <p className="mt-2 text-gray-600">Your account overview will appear here.</p>
      </div>
    </Layout>
  );
}
