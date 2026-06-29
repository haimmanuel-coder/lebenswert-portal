import React, { createContext, useCallback, useContext } from "react";
import { trpc } from "@/lib/trpc";

const TOKEN_KEY = "lb_portal_token";

export function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setStoredToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}
export function clearStoredToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

interface MitarbeiterInfo {
  id: number;
  vorname: string;
  nachname: string;
  email: string;
  rolle: string;
}

interface PortalAuthContextType {
  mitarbeiter: MitarbeiterInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refetch: () => Promise<unknown>;
}

const PortalAuthContext = createContext<PortalAuthContextType | null>(null);

export function PortalAuthProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();

  const { data, isLoading, refetch, isError } = trpc.portal.me.useQuery(undefined, {
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Abgelaufener oder ungültiger Token – automatisch löschen
  React.useEffect(() => {
    if (isError) clearStoredToken();
  }, [isError]);

  const logoutMutation = trpc.portal.logout.useMutation({
    onSuccess: async () => {
      clearStoredToken();
      await utils.portal.me.invalidate();
      await refetch();
    },
  });

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  const doRefetch = useCallback(async () => {
    await utils.portal.me.invalidate();
    return refetch();
  }, [refetch, utils.portal.me]);

  return (
    <PortalAuthContext.Provider
      value={{
        mitarbeiter: data ?? null,
        isLoading,
        isAuthenticated: !!data,
        logout,
        refetch: doRefetch,
      }}
    >
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error("usePortalAuth must be used within PortalAuthProvider");
  return ctx;
}
