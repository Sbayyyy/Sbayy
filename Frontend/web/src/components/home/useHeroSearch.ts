import { useCallback, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/router';
import { defaultTextInputValidator, loadProfanityListFromUrl } from '@sbay/shared';

interface UseHeroSearchOptions {
  selectedRegion: string;
}

export function useHeroSearch({ selectedRegion }: UseHeroSearchOptions) {
  const router = useRouter();
  const profanityLoadRef = useRef<Promise<void> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');

  const ensureProfanityList = useCallback(() => {
    if (!profanityLoadRef.current) {
      profanityLoadRef.current = loadProfanityListFromUrl('/profanities.txt').catch(() => {});
    }

    return profanityLoadRef.current;
  }, []);

  const validateSearch = useCallback((value: string) => {
    const validation = defaultTextInputValidator.validate(value);
    setSearchError(validation.isValid ? '' : validation.message ?? 'Input contains disallowed content');
    return validation.isValid;
  }, []);

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setSearchQuery(next);
    if (searchError) {
      validateSearch(next);
    }
  }, [searchError, validateSearch]);

  const handleSearchSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();

    await ensureProfanityList();
    if (!validateSearch(trimmedQuery)) return;

    const params = new URLSearchParams();
    if (trimmedQuery) params.set('q', trimmedQuery);
    if (selectedRegion) params.set('region', selectedRegion);

    router.push(`/browse${params.toString() ? `?${params.toString()}` : ''}`);
  }, [ensureProfanityList, router, searchQuery, selectedRegion, validateSearch]);

  return {
    searchQuery,
    searchError,
    handleSearchChange,
    handleSearchSubmit,
    ensureProfanityList,
  };
}
