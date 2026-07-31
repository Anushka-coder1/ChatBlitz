import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { getCurrentUser } from "./services/auth.service.js";
import { useUserStore } from "./store/useUserStore.js";

const ScreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text)]">
    <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-4 shadow-2xl backdrop-blur">
      Checking your session...
    </div>
  </div>
);

export const ProtectedRoute = () => {
  const location = useLocation();
  const { token, setUser, clearUser } = useUserStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let ignore = false;

    const verify = async () => {
      if (!token) {
        if (!ignore) setIsChecking(false);
        return;
      }

      try {
        const response = await getCurrentUser();
        if (!ignore) {
          setUser(response.data, token);
        }
      } catch {
        if (!ignore) {
          clearUser();
        }
      } finally {
        if (!ignore) {
          setIsChecking(false);
        }
      }
    };

    verify();

    return () => {
      ignore = true;
    };
  }, [token, setUser, clearUser]);

  if (isChecking) {
    return <ScreenLoader />;
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
};

export const PublicRoute = () => {
  const { token } = useUserStore();

  if (token) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
