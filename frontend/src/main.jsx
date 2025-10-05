import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import ThemeProvider from "./utils/ThemeContext";
import App from "./App";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./utils/QueryClient";
import { ErrorBoundary } from "react-error-boundary";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary
            fallback={
              <div className="h-[100vh] w-full flex items-center justify-center">
                系统错误，请刷新网页
              </div>
            }
          >
            <App />
          </ErrorBoundary>
        </QueryClientProvider>
      </ThemeProvider>
    </Router>
  </React.StrictMode>
);
