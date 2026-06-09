import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import { Spinner } from "./components/ui";

const MarketplaceHome = lazy(() => import("./pages/store/MarketplaceHome"));
const RestaurantSite = lazy(() => import("./pages/store/RestaurantSite"));
const Checkout = lazy(() => import("./pages/store/Checkout"));
const Track = lazy(() => import("./pages/store/Track"));
const Account = lazy(() => import("./pages/store/Account"));
const AdminPanel = lazy(() => import("./pages/admin/AdminPanel"));
const SuperPanel = lazy(() => import("./pages/super/SuperPanel"));

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Switch>
        <Route path="/" component={MarketplaceHome} />
        <Route path="/account" component={Account} />
        <Route path="/r/:slug" component={RestaurantSite} />
        <Route path="/r/:slug/checkout" component={Checkout} />
        <Route path="/r/:slug/track/:orderNo" component={Track} />
        <Route path="/admin" component={AdminPanel} nest={false} />
        <Route path="/admin/*" component={AdminPanel} />
        <Route path="/super" component={SuperPanel} nest={false} />
        <Route path="/super/*" component={SuperPanel} />
        <Route>
          <MarketplaceHome />
        </Route>
      </Switch>
    </Suspense>
  );
}
