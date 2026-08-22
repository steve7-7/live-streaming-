import type { ReactNode } from "react";

/**
 * Authentication is optional for public browsing. The provider restores a saved
 * session in the background; protected routes decide when sign-in is required.
 */
export default function AuthBoundary({ children }: { children: ReactNode }) {
  return children;
}
