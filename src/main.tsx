import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App";
import { initObservability } from "./lib/analytics";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./auth/AuthContext";
import AuthBoundary from "./auth/AuthBoundary";

initObservability();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthBoundary>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
