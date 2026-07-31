import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaComments, FaEnvelope, FaMobileAlt, FaShieldAlt, FaUser, FaUserTag } from "react-icons/fa";
import { toast } from "react-toastify";

import { completeProfileRequest, sendOtpRequest, verifyOtpRequest } from "../services/auth.service.js";
import { useThemeStore } from "../store/themeStore.js";
import { useUserStore } from "../store/useUserStore.js";

const initialForms = {
  auth: { email: "", phoneNumber: "", phoneSuffix: "+91" },
  otp: { code: "" },
  profile: { name: "", username: "", bio: "" },
};

const InputRow = ({ icon: Icon, ...props }) => (
  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
    <Icon className="shrink-0 text-[var(--text-muted)]" />
    <input
      {...props}
      className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
    />
  </label>
);

const AuthPage = ({ mode = "login" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useUserStore();
  const { theme, toggleTheme } = useThemeStore();
  const [activeMode, setActiveMode] = useState(mode);
  const [forms, setForms] = useState(initialForms);
  const [step, setStep] = useState("identity");
  const [authChannel, setAuthChannel] = useState("email");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  const title = useMemo(
    () =>
      step === "otp"
        ? "Enter the verification code"
        : step === "profile"
          ? "Complete your profile"
          : activeMode === "login"
            ? "Sign in to your ChatBlitz workspace"
            : "Create your ChatBlitz account",
    [activeMode, step],
  );

  const updateField = (formName, field, value) => {
    setForms((current) => ({
      ...current,
      [formName]: {
        ...current[formName],
        [field]: value,
      },
    }));
  };

  const handleIdentitySubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const payload =
        authChannel === "email"
          ? { email: forms.auth.email }
          : {
              phoneNumber: forms.auth.phoneNumber,
              phoneSuffix: forms.auth.phoneSuffix,
            };

      await sendOtpRequest(payload);
      toast.success(authChannel === "email" ? "OTP sent to your email" : "OTP sent to your phone");
      setStep("otp");
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const payload =
        authChannel === "email"
          ? { email: forms.auth.email, otp: forms.otp.code }
          : {
              phoneNumber: forms.auth.phoneNumber,
              phoneSuffix: forms.auth.phoneSuffix,
              otp: forms.otp.code,
            };

      const response = await verifyOtpRequest(payload);
      setUser(response.data.user, response.data.token);

      const hasProfile = response.data.user?.name && response.data.user?.username;
      if (!hasProfile) {
        setForms((current) => ({
          ...current,
          profile: {
            ...current.profile,
            name: response.data.user?.name || "",
            username: response.data.user?.username || "",
          },
        }));
        setStep("profile");
        toast.success("OTP verified");
        return;
      }

      toast.success(activeMode === "login" ? "Welcome back" : "Account created");
      const redirectTarget = location.state?.from || "/";
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to verify OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await completeProfileRequest(forms.profile);
      setUser(response.data.user);
      toast.success("Profile completed");
      const redirectTarget = location.state?.from || "/";
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-8 text-[var(--text)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--bg-elevated)] shadow-2xl backdrop-blur lg:flex-row">
        <div className="relative flex flex-1 flex-col justify-between overflow-hidden p-8 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.2),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.16),transparent_24%)]" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[var(--accent)]/20 p-3 text-[var(--accent)]">
                <FaComments className="text-xl" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">ChatBlitz</p>
                <h1 className="text-xl font-semibold">Realtime conversations without the clutter</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-white/20 hover:text-[var(--text)]"
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>

          <div className="relative mt-12 grid gap-6">
            <div className="inline-flex w-fit rounded-full border border-white/10 bg-white/5 p-1 text-sm">
              <Link
                to="/login"
                className={`rounded-full px-4 py-2 transition ${activeMode === "login" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}
              >
                Login
              </Link>
              <Link
                to="/register"
                className={`rounded-full px-4 py-2 transition ${activeMode === "register" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}
              >
                Register
              </Link>
            </div>

            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[var(--text-muted)]">
                Modern WhatsApp + Discord inspired collaboration
              </p>
              <h2 className="mt-4 max-w-xl text-4xl font-semibold leading-tight">{title}</h2>
              <p className="mt-4 max-w-xl text-base text-[var(--text-muted)]">
                Secure JWT sessions, Socket.IO presence, file sharing, message states, and responsive chat flows built for real-world teams.
              </p>
            </div>

            <div className="grid gap-4 text-sm text-[var(--text-muted)] md:grid-cols-3">
              {[
                "Instant one-to-one and group messaging",
                "Media uploads with cloud storage",
                "Presence, notifications, and read receipts",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-xl items-center border-t border-white/10 bg-black/10 p-6 lg:border-l lg:border-t-0 lg:p-10">
          {step === "identity" ? (
            <form onSubmit={handleIdentitySubmit} className="w-full space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setAuthChannel("email")}
                  className={`rounded-2xl px-4 py-2 transition ${authChannel === "email" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}
                >
                  Email OTP
                </button>
                <button
                  type="button"
                  onClick={() => setAuthChannel("phone")}
                  className={`rounded-2xl px-4 py-2 transition ${authChannel === "phone" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}
                >
                  Phone OTP
                </button>
              </div>

              {authChannel === "email" ? (
                <InputRow
                  icon={FaEnvelope}
                  type="email"
                  placeholder="Email address"
                  value={forms.auth.email}
                  onChange={(event) => updateField("auth", "email", event.target.value)}
                  required
                />
              ) : (
                <div className="flex gap-3">
                  <label className="w-28 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <input
                      value={forms.auth.phoneSuffix}
                      onChange={(event) => updateField("auth", "phoneSuffix", event.target.value)}
                      className="w-full bg-transparent text-sm text-[var(--text)] outline-none"
                    />
                  </label>
                  <label className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <FaMobileAlt className="shrink-0 text-[var(--text-muted)]" />
                    <input
                      value={forms.auth.phoneNumber}
                      onChange={(event) => updateField("auth", "phoneNumber", event.target.value)}
                      placeholder="Phone number"
                      className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
                      required
                    />
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 font-medium text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Sending OTP..." : "Send OTP"}
              </button>

              <p className="text-center text-sm text-[var(--text-muted)]">
                {activeMode === "login" ? "Need an account?" : "Already have an account?"}{" "}
                <Link
                  to={activeMode === "login" ? "/register" : "/login"}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  {activeMode === "login" ? "Register now" : "Sign in"}
                </Link>
              </p>
            </form>
          ) : null}

          {step === "otp" ? (
            <form onSubmit={handleOtpSubmit} className="w-full space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-muted)]">
                <div className="mb-2 flex items-center gap-2 text-[var(--text)]">
                  <FaShieldAlt />
                  <span>Verification code sent</span>
                </div>
                {authChannel === "email"
                  ? `We sent a 6-digit code to ${forms.auth.email}.`
                  : `We sent a 6-digit code to ${forms.auth.phoneSuffix} ${forms.auth.phoneNumber}.`}
              </div>

              <InputRow
                icon={FaShieldAlt}
                placeholder="Enter 6-digit OTP"
                value={forms.otp.code}
                onChange={(event) => updateField("otp", "code", event.target.value)}
                required
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 font-medium text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={() => setStep("identity")}
                className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]"
              >
                Change email or phone
              </button>
            </form>
          ) : null}

          {step === "profile" ? (
            <form onSubmit={handleProfileSubmit} className="w-full space-y-4">
              <InputRow
                icon={FaUser}
                placeholder="Full name"
                value={forms.profile.name}
                onChange={(event) => updateField("profile", "name", event.target.value)}
              />
              <InputRow
                icon={FaUserTag}
                placeholder="Username"
                value={forms.profile.username}
                onChange={(event) => updateField("profile", "username", event.target.value)}
              />
              <label className="flex min-h-28 flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <span className="text-sm text-[var(--text-muted)]">Bio</span>
                <textarea
                  placeholder="Tell people a little about yourself"
                  value={forms.profile.bio}
                  onChange={(event) => updateField("profile", "bio", event.target.value)}
                  className="min-h-16 resize-none bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 font-medium text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Saving..." : "Continue to ChatBlitz"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
