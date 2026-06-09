import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { settingsStore, hydrateStore } from "@/lib/store";
import { applyTheme } from "@/lib/themeUtils";
import { verifyAdminToken } from "@/lib/adminAuth";
import { useState } from "react";

// ── Customer-facing pages (critical path — statically imported) ───────────────
import NavBar from "@/components/NavBar";
import ClearCartDialog from "@/components/ClearCartDialog";
import BottomNav from "@/components/BottomNav";
import GlobalWhatsAppButton from "@/components/GlobalWhatsAppButton";
import Home from "@/pages/Home";
import RestaurantPage from "@/pages/RestaurantPage";
import BranchPage from "@/pages/BranchPage";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import ConfirmationPage from "@/pages/ConfirmationPage";
import ReviewPage from "@/pages/ReviewPage";
import FavoritesPage from "@/pages/FavoritesPage";
import ProfilePage from "@/pages/ProfilePage";
import OffersPage from "@/pages/OffersPage";
import NotFound from "@/pages/not-found";

// ── Admin pages (lazy — only loaded when /admin is visited) ───────────────────
const AdminAuth         = lazy(() => import("@/pages/admin/AdminAuth"));
const AdminLayout       = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminDashboard    = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminRestaurants  = lazy(() => import("@/pages/admin/AdminRestaurants"));
const AdminBranches     = lazy(() => import("@/pages/admin/AdminBranches"));
const AdminMenu         = lazy(() => import("@/pages/admin/AdminMenu"));
const AdminCoupons      = lazy(() => import("@/pages/admin/AdminCoupons"));
const AdminReviews      = lazy(() => import("@/pages/admin/AdminReviews"));
const AdminOffers       = lazy(() => import("@/pages/admin/AdminOffers"));
const AdminSettings     = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminDeliveryZones= lazy(() => import("@/pages/admin/AdminDeliveryZones"));
const AdminCustomers    = lazy(() => import("@/pages/admin/AdminCustomers"));
const AdminAnalytics    = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminBanners      = lazy(() => import("@/pages/admin/AdminBanners"));
const AdminBackgrounds  = lazy(() => import("@/pages/admin/AdminBackgrounds"));
const AdminAppearance   = lazy(() => import("@/pages/admin/AdminAppearance"));
const AdminMenuSorting  = lazy(() => import("@/pages/admin/AdminMenuSorting"));
const AdminBranchMenu   = lazy(() => import("@/pages/admin/AdminBranchMenu"));
const AdminModifiers    = lazy(() => import("@/pages/admin/AdminModifiers"));
const AdminContentControl = lazy(() => import("@/pages/admin/AdminContentControl"));
const AdminMenuImport   = lazy(() => import("@/pages/admin/AdminMenuImport"));

// ─────────────────────────────────────────────────────────────────────────────

const queryClient = new QueryClient();

function Spinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const storedToken = sessionStorage.getItem("admin_token") || "";
  const [state, setState] = useState<"loading" | "authed" | "unauthed">(
    storedToken ? "loading" : "unauthed"
  );

  useEffect(() => {
    if (!storedToken) { setState("unauthed"); return; }
    verifyAdminToken(storedToken).then((valid) => {
      if (valid) setState("authed");
      else { sessionStorage.removeItem("admin_token"); setState("unauthed"); }
    });
  }, []);

  // Fired by the store when the server rejects the JWT (expired session) —
  // drop back to the login screen without a page reload.
  useEffect(() => {
    const onExpired = () => setState("unauthed");
    window.addEventListener("admin-session-expired", onExpired);
    return () => window.removeEventListener("admin-session-expired", onExpired);
  }, []);

  if (state === "loading") return <Spinner />;

  if (state === "unauthed") {
    return (
      <Suspense fallback={<Spinner />}>
        <AdminAuth onAuth={(token) => { sessionStorage.setItem("admin_token", token); setState("authed"); }} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<Spinner />}>
      <AdminLayout>{children}</AdminLayout>
    </Suspense>
  );
}

function AppRoutes() {
  useEffect(() => {
    hydrateStore().then(() => {
      applyTheme(settingsStore.get());
    });
    const handler = () => applyTheme(settingsStore.get());
    window.addEventListener("store-updated", handler);
    return () => window.removeEventListener("store-updated", handler);
  }, []);

  return (
    <>
      <Switch>
        {/* ── Admin routes ─────────────────────────────────────── */}
        <Route path="/admin">
          <AdminGuard><AdminDashboard /></AdminGuard>
        </Route>
        <Route path="/admin/restaurants">
          <AdminGuard><AdminRestaurants /></AdminGuard>
        </Route>
        <Route path="/admin/branches">
          <AdminGuard><AdminBranches /></AdminGuard>
        </Route>
        <Route path="/admin/menu">
          <AdminGuard><AdminMenu /></AdminGuard>
        </Route>
        <Route path="/admin/offers">
          <AdminGuard><AdminOffers /></AdminGuard>
        </Route>
        <Route path="/admin/coupons">
          <AdminGuard><AdminCoupons /></AdminGuard>
        </Route>
        <Route path="/admin/reviews">
          <AdminGuard><AdminReviews /></AdminGuard>
        </Route>
        <Route path="/admin/settings">
          <AdminGuard><AdminSettings /></AdminGuard>
        </Route>
        <Route path="/admin/delivery-zones">
          <AdminGuard><AdminDeliveryZones /></AdminGuard>
        </Route>
        <Route path="/admin/customers">
          <AdminGuard><AdminCustomers /></AdminGuard>
        </Route>
        <Route path="/admin/analytics">
          <AdminGuard><AdminAnalytics /></AdminGuard>
        </Route>
        <Route path="/admin/banners">
          <AdminGuard><AdminBanners /></AdminGuard>
        </Route>
        <Route path="/admin/backgrounds">
          <AdminGuard><AdminBackgrounds /></AdminGuard>
        </Route>
        <Route path="/admin/appearance">
          <AdminGuard><AdminAppearance /></AdminGuard>
        </Route>
        <Route path="/admin/sorting">
          <AdminGuard><AdminMenuSorting /></AdminGuard>
        </Route>
        <Route path="/admin/branch-menu">
          <AdminGuard><AdminBranchMenu /></AdminGuard>
        </Route>
        <Route path="/admin/modifiers">
          <AdminGuard><AdminModifiers /></AdminGuard>
        </Route>
        <Route path="/admin/content">
          <AdminGuard><AdminContentControl /></AdminGuard>
        </Route>
        <Route path="/admin/import">
          <AdminGuard><AdminMenuImport /></AdminGuard>
        </Route>

        {/* ── Customer routes ──────────────────────────────────── */}
        <Route>
          <NavBar />
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/restaurant/:restaurantId" component={RestaurantPage} />
            <Route path="/restaurant/:restaurantId/branch/:branchId" component={BranchPage} />
            <Route path="/offers" component={OffersPage} />
            <Route path="/cart" component={CartPage} />
            <Route path="/checkout" component={CheckoutPage} />
            <Route path="/confirmation" component={ConfirmationPage} />
            <Route path="/review" component={ReviewPage} />
            <Route path="/favorites" component={FavoritesPage} />
            <Route path="/profile" component={ProfilePage} />
            <Route component={NotFound} />
          </Switch>
          <ClearCartDialog />
          <GlobalWhatsAppButton />
          <BottomNav />
        </Route>
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <CartProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppRoutes />
            </WouterRouter>
            <Toaster />
          </CartProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
