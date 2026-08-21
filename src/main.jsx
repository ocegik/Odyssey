import React from "react";
import ReactDOM from "react-dom/client";
import CATMockTracker from "./App.jsx";
import AdminRoute from "./AdminRoute.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { supabase } from "./lib/supabaseClient";
import "./index.css";

async function bootstrap() {
  if (supabase) {
    // The Supabase client begins callback parsing as soon as it is created.
    // Await it before React (and useHashTab) mounts so the hash router never
    // gets a chance to rewrite OAuth's fragment before session persistence.
    const { error } = await supabase.auth.getSession();
    if (error) console.error("Could not restore the signed-in session:", error.message);
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <ErrorBoundary>
        {window.location.pathname.replace(/\/+$/, "") === "/admin" ? <AdminRoute /> : <CATMockTracker />}
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

bootstrap();
