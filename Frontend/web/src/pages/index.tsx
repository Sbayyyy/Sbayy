import { useState } from 'react';
import Layout from '@/components/Layout';
import HomeCategoryGrid from '@/components/home/HomeCategoryGrid';
import HomeHero from '@/components/home/HomeHero';
import HomeListingSections from '@/components/home/HomeListingSections';
import { useHeroSearch } from '@/components/home/useHeroSearch';
import { useHomeListings } from '@/components/home/useHomeListings';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';

export default function Home() {
  const { t } = useTranslation('common');
  const [selectedRegion, setSelectedRegion] = useState('');
  const {
    browseProducts,
    featuredProducts,
    recommendedProducts,
    loading,
    loadingMore,
    hasMore,
    loadMoreBrowse,
  } = useHomeListings();
  const {
    searchQuery,
    searchError,
    handleSearchChange,
    handleSearchSubmit,
    ensureProfanityList,
  } = useHeroSearch({ selectedRegion });

  return (
    <Layout title={t('home.title')} description={t('home.heroSubtitle')}>
      <div className="app-page space-y-10 pb-8">
        <HomeHero
          searchQuery={searchQuery}
          searchError={searchError}
          selectedRegion={selectedRegion}
          onSearchChange={handleSearchChange}
          onSearchFocus={ensureProfanityList}
          onSearchSubmit={handleSearchSubmit}
          onRegionChange={setSelectedRegion}
        />

        <HomeListingSections
          recommendedProducts={recommendedProducts}
          browseProducts={browseProducts}
          featuredProducts={featuredProducts}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMoreBrowse}
          categorySlot={<HomeCategoryGrid />}
        />
      </div>
    </Layout>
  );
}

export async function getStaticProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common'])),
    },
  };
}
