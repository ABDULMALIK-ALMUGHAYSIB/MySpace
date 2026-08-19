import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicOnlyRoute from "@/components/PublicOnlyRoute";
import AuthLayout from "@/components/AuthLayout";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import DashboardPage from "@/pages/DashboardPage";
import BoardPage from "@/pages/BoardPage";
import { ThemeContext, useThemeState } from "@/lib/theme";

export default function App() {
  const theme = useThemeState();

  return (
    <ThemeContext.Provider value={theme}>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/board" element={<BoardPage />} />
            </Route>
          </Route>
        </Routes>
        <Toaster richColors position="top-right" theme={theme.isDark ? "dark" : "light"} />
      </AuthProvider>
    </ThemeContext.Provider>
  );
}
