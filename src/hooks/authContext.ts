import { createContext, useContext } from "react";
import type { ApiUser } from "../services/api";

export interface AuthContextType {
  user: ApiUser | null;
  loading: boolean; // resolviendo /api/auth/me al arrancar
  // false = no hay API detrás (build estático servido sin functions): la app
  // funciona en modo local y se oculta toda la UI de cuentas
  backendAvailable: boolean;
  login: (email: string, password: string) => Promise<string | null>; // null = ok
  register: (email: string, password: string, code: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
