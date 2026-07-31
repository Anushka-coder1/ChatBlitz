import api from "./api.js";

export const sendOtpRequest = async (payload) => {
  const response = await api.post("/auth/send-otp", payload);
  return response.data;
};

export const verifyOtpRequest = async (payload) => {
  const response = await api.post("/auth/verify-otp", payload);
  return response.data;
};

export const completeProfileRequest = async (payload) => {
  const response = await api.patch("/auth/complete-profile", payload);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};
