import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setToken } from "./api";

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "RESTAURANT_OWNER" | "BRANCH_MANAGER" | "STAFF";
  restaurantId: string | null;
  branchId: string | null;
  permissions: string[];
}

export interface CustomerUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  referralCode: string;
}

interface AuthContextValue {
  staff: StaffUser | null;
  customer: CustomerUser | null;
  loadingStaff: boolean;
  loadingCustomer: boolean;
  staffLogin: (email: string, password: string) => Promise<StaffUser>;
  customerLogin: (phone: string, password: string) => Promise<void>;
  customerRegister: (input: { name: string; phone: string; password: string; email?: string; referralCode?: string }) => Promise<void>;
  logoutStaff: () => Promise<void>;
  logoutCustomer: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingCustomer, setLoadingCustomer] = useState(true);

  useEffect(() => {
    api<{ user: StaffUser }>("/api/auth/me", { scope: "staff" })
      .then((d) => setStaff(d.user))
      .catch(() => setStaff(null))
      .finally(() => setLoadingStaff(false));
    api<{ customer: CustomerUser }>("/api/auth/customer/me", { scope: "customer" })
      .then((d) => setCustomer(d.customer))
      .catch(() => setCustomer(null))
      .finally(() => setLoadingCustomer(false));
  }, []);

  const staffLogin = useCallback(async (email: string, password: string) => {
    const d = await api<{ accessToken: string; user: StaffUser }>("/api/auth/login", {
      body: { email, password },
      scope: null,
    });
    setToken("staff", d.accessToken);
    setStaff(d.user);
    return d.user;
  }, []);

  const customerLogin = useCallback(async (phone: string, password: string) => {
    const d = await api<{ accessToken: string; customer: CustomerUser }>("/api/auth/customer/login", {
      body: { phone, password },
      scope: null,
    });
    setToken("customer", d.accessToken);
    setCustomer(d.customer);
  }, []);

  const customerRegister = useCallback(
    async (input: { name: string; phone: string; password: string; email?: string; referralCode?: string }) => {
      const d = await api<{ accessToken: string; customer: CustomerUser }>("/api/auth/customer/register", {
        body: input,
        scope: null,
      });
      setToken("customer", d.accessToken);
      setCustomer(d.customer);
    },
    [],
  );

  const logoutStaff = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST", scope: null }).catch(() => undefined);
    setToken("staff", null);
    setStaff(null);
  }, []);

  const logoutCustomer = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST", scope: null }).catch(() => undefined);
    setToken("customer", null);
    setCustomer(null);
  }, []);

  const hasPermission = useCallback(
    (perm: string) => {
      if (!staff) return false;
      if (staff.role === "SUPER_ADMIN" || staff.role === "RESTAURANT_OWNER") return true;
      if (staff.role === "BRANCH_MANAGER") {
        return ["orders.view", "orders.manage", "catalog.view", "inventory.manage", "zones.manage", "reports.view"].includes(perm);
      }
      return staff.permissions.includes(perm);
    },
    [staff],
  );

  const value = useMemo(
    () => ({
      staff, customer, loadingStaff, loadingCustomer,
      staffLogin, customerLogin, customerRegister, logoutStaff, logoutCustomer, hasPermission,
    }),
    [staff, customer, loadingStaff, loadingCustomer, staffLogin, customerLogin, customerRegister, logoutStaff, logoutCustomer, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
