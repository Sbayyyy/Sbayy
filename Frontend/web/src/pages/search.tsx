import type { GetServerSideProps } from 'next';

/**
 * /search is deprecated. Browse owns search + filters now.
 * Preserve query params (q, region, category, condition, minPrice, maxPrice, sortBy)
 * so deep links and external traffic keep working.
 */
export default function SearchRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const params = new URLSearchParams();
  const passThrough = ['q', 'region', 'category', 'condition', 'minPrice', 'maxPrice', 'sortBy'] as const;

  for (const key of passThrough) {
    const value = query[key];
    if (typeof value === 'string' && value.length > 0) {
      params.set(key, value);
    }
  }

  return {
    redirect: {
      destination: params.toString() ? `/browse?${params.toString()}` : '/browse',
      permanent: false,
    },
  };
};
