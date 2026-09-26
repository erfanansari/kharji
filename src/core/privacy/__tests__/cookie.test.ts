import { isPrivacyHidden, PRIVACY_COOKIE, writePrivacyCookie } from '../cookie';

describe('privacy cookie', () => {
  describe('isPrivacyHidden', () => {
    it('reads a set cookie as hidden', () => {
      expect(isPrivacyHidden('1')).toBe(true);
    });

    it('treats a missing cookie as visible', () => {
      expect(isPrivacyHidden(undefined)).toBe(false);
    });

    it('treats anything unrecognised as visible rather than throwing', () => {
      expect(isPrivacyHidden('yes please')).toBe(false);
    });
  });

  describe('writePrivacyCookie', () => {
    afterEach(() => {
      document.cookie = `${PRIVACY_COOKIE}=; path=/; max-age=0`;
    });

    it('round-trips through the document cookie', () => {
      writePrivacyCookie(true);
      const raw = document.cookie
        .split('; ')
        .find((c) => c.startsWith(`${PRIVACY_COOKIE}=`))
        ?.split('=')[1];
      expect(isPrivacyHidden(raw)).toBe(true);
    });

    it('clears the cookie when privacy is turned back off', () => {
      writePrivacyCookie(true);
      writePrivacyCookie(false);
      expect(document.cookie).not.toContain(`${PRIVACY_COOKIE}=1`);
    });
  });
});
