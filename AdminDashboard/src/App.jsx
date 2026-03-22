import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import AdminLayout from "./components/Layout/AdminLayout";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import TransactionsPage from "./pages/TransactionsPage";
import MerchantsPage from "./pages/MerchantsPage";
import CardsPage from "./pages/CardsPage";
import EducationPage from "./pages/EducationPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import LoginPage from "./pages/LoginPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "./index.css";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        >
          <div className="App">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <DashboardPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <DashboardPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <UsersPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transactions"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <TransactionsPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/merchants"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <MerchantsPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cards"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <CardsPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/education"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <EducationPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AdminLayout>
                      <AnalyticsPage />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#363636",
                  color: "#fff",
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
