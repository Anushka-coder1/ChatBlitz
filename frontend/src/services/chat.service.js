import api from "./api.js";

export const getChats = async ({ page = 1, limit = 20 } = {}) => {
  const response = await api.get("/chats", { params: { page, limit } });
  return response.data;
};

export const createDirectChat = async (userId) => {
  const response = await api.post("/chats/direct", { userId });
  return response.data;
};

export const createGroupChat = async (payload) => {
  const response = await api.post("/chats/group", payload);
  return response.data;
};

export const getMessages = async (chatId, { page = 1, limit = 25 } = {}) => {
  const response = await api.get(`/chats/${chatId}/messages`, {
    params: { page, limit },
  });
  return response.data;
};

export const sendMessage = async (chatId, formData) => {
  const response = await api.post(`/chats/${chatId}/messages`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const editMessage = async (chatId, messageId, text) => {
  const response = await api.patch(`/chats/${chatId}/messages/${messageId}`, { text });
  return response.data;
};

export const deleteMessage = async (chatId, messageId) => {
  const response = await api.delete(`/chats/${chatId}/messages/${messageId}`);
  return response.data;
};

export const markChatAsRead = async (chatId) => {
  const response = await api.patch(`/chats/${chatId}/read`);
  return response.data;
};

export const updateGroup = async (chatId, payload) => {
  const response = await api.patch(`/chats/${chatId}/group`, payload);
  return response.data;
};

export const leaveGroup = async (chatId) => {
  const response = await api.post(`/chats/${chatId}/group/leave`);
  return response.data;
};

export const deleteGroup = async (chatId) => {
  const response = await api.delete(`/chats/${chatId}/group`);
  return response.data;
};

export const getAttachments = async (chatId) => {
  const response = await api.get(`/chats/${chatId}/attachments`);
  return response.data;
};
