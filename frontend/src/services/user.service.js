import api from "./api.js";

export const searchUsers = async (search = "") => {
  const response = await api.get("/users", { params: { search } });
  return response.data;
};

export const getUserDetails = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const updateProfile = async (formData) => {
  const response = await api.put("/users/profile/me", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};
