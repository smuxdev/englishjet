import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ApiError, apiFetch, type ApiUser } from "../services/api";
import { AuthContext } from "./authContext";

function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "invalid_credentials":
        return "Email o contraseña incorrectos";
      case "email_taken":
        return "Ya existe una cuenta con ese email";
      case "bad_code":
        return "Código de invitación incorrecto";
      case "too_many_attempts":
        return "Demasiados intentos fallidos — espera 15 minutos";
      case "bad_email":
        return "Ese email no parece válido";
      case "bad_password":
        return "La contraseña debe tener al menos 8 caracteres";
    }
  }
  return "No se pudo conectar con el servidor";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);

  // Un 401 JSON limpio de /api/auth/me = hay backend pero no hay sesión →
  // pantalla de bienvenida. Cualquier otra cosa (404, HTML del fallback SPA,
  // fallo de red) = build estático sin functions → modo local sin cuentas.
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ user: ApiUser }>("/api/auth/me")
      .then(({ user: u }) => {
        if (!cancelled) setUser(u);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setUser(null);
        const cleanUnauthorized =
          error instanceof ApiError && error.status === 401 && error.code === "unauthorized";
        setBackendAvailable(cleanUnauthorized);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const { user: u } = await apiFetch<{ user: ApiUser }>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setUser(u);
      return null;
    } catch (error) {
      return authErrorMessage(error);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, code: string): Promise<string | null> => {
    try {
      const { user: u } = await apiFetch<{ user: ApiUser }>("/api/auth/register", {
        method: "POST",
        body: { email, password, code },
      });
      setUser(u);
      return null;
    } catch (error) {
      return authErrorMessage(error);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST", body: {} });
    } catch (error) {
      console.warn("Logout falló en el servidor (la sesión local se cierra igual):", error);
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, backendAvailable, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
