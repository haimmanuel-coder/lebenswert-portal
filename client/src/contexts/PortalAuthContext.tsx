import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

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
  refetch: () => void;
}

const PortalAuthContext = createContext<PortalAuthContextType | null>(null);

export function PortalAuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, refetch } = trpc.portal.me.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const logoutMutation = trpc.portal.logout.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  return (
    <PortalAuthContext.Provider
      value={{
        mitarbeiter: data ?? null,
        isLoading,
        isAuthenticated: !!data,
        logout,
        refetch,
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
