import { getLocalizedLoginRedirect, isAuthPath } from '@/lib/auth-redirect';

describe('auth redirect helpers', () => {
  it('keeps explicit English locale when redirecting to login', () => {
    expect(getLocalizedLoginRedirect('/en/profile/settings', '?tab=security')).toBe(
      '/en/auth/login?redirect=%2Fen%2Fprofile%2Fsettings%3Ftab%3Dsecurity',
    );
  });

  it('keeps explicit Arabic locale when redirecting to login', () => {
    expect(getLocalizedLoginRedirect('/ar/messages')).toBe(
      '/ar/auth/login?redirect=%2Far%2Fmessages',
    );
  });

  it('uses the default locale route when the current path has no locale prefix', () => {
    expect(getLocalizedLoginRedirect('/browse')).toBe(
      '/auth/login?redirect=%2Fbrowse',
    );
  });

  it('uses the active English locale when the router path has no locale prefix', () => {
    expect(getLocalizedLoginRedirect('/profile/settings', '?tab=security', 'en')).toBe(
      '/en/auth/login?redirect=%2Fprofile%2Fsettings%3Ftab%3Dsecurity',
    );
  });

  it('keeps the default Arabic route when the active locale is Arabic', () => {
    expect(getLocalizedLoginRedirect('/profile/settings', '', 'ar')).toBe(
      '/auth/login?redirect=%2Fprofile%2Fsettings',
    );
  });

  it('detects localized and unlocalized auth routes', () => {
    expect(isAuthPath('/auth/login')).toBe(true);
    expect(isAuthPath('/ar/auth/register')).toBe(true);
    expect(isAuthPath('/en/auth/resetPassword')).toBe(true);
    expect(isAuthPath('/en/profile')).toBe(false);
  });
});
