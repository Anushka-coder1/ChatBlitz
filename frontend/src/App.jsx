import "./App.css";
import "react-toastify/dist/ReactToastify.css";

import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import { ProtectedRoute, PublicRoute } from "./protected.jsx";

const AuthPage = lazy(() => import("./pages/AuthPage.jsx"));
const ChatPage = lazy(() => import("./pages/ChatPage.jsx"));

const FullScreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text)]">
    <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-4 shadow-2xl backdrop-blur">
      Loading ChatBlitz...
    </div>
  </div>
);

function App() {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2800}
        newestOnTop
        theme="colored"
      />
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<ChatPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
