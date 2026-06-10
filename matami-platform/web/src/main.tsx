import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./lib/i18n";
import { AuthProvider } from "./lib/auth";
import { CartProvider } from "./lib/cart";
import { ToastProvider } from "./components/ui";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  </StrictMode>,
);
