const ACCESS_TOKEN_KEY = "streamly_access_token";
const REFRESH_TOKEN_KEY = "streamly_refresh_token";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export const authStorage = {
  accessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  refreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  hasSession: () =>
    Boolean(localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY)),
  save: ({ accessToken, refreshToken }: StoredTokens) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const AUTH_EXPIRED_EVENT = "streamly:auth-expired";
