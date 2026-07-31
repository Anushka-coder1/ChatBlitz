import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  FaBell,
  FaCheck,
  FaChevronLeft,
  FaFileAlt,
  FaImage,
  FaMoon,
  FaPaperPlane,
  FaPaperclip,
  FaPen,
  FaPlus,
  FaSearch,
  FaSignOutAlt,
  FaSun,
  FaTrash,
  FaUserEdit,
  FaUsers,
  FaVideo,
  FaVolumeUp,
} from "react-icons/fa";
import { toast } from "react-toastify";

import { logoutUser } from "../services/auth.service.js";
import {
  createDirectChat,
  createGroupChat,
  deleteGroup,
  deleteMessage,
  editMessage,
  getAttachments,
  getChats,
  getMessages,
  leaveGroup,
  markChatAsRead,
  sendMessage,
  updateGroup,
} from "../services/chat.service.js";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../services/notification.service.js";
import { disconnectSocket, initializeSocket } from "../services/socket.service.js";
import { searchUsers, updateProfile } from "../services/user.service.js";
import { useThemeStore } from "../store/themeStore.js";
import { useUserStore } from "../store/useUserStore.js";

const EMOJIS = ["😀", "😂", "🔥", "❤️", "🙌", "🎉", "💡", "👍", "👀", "🚀"];

const formatTime = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const formatDay = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));

const getChatTitle = (chat) => (chat?.isGroup ? chat.name : chat?.counterpart?.name || "New chat");
const getChatAvatar = (chat) => chat?.avatar || chat?.counterpart?.profilePicture || "";
const getChatSubtitle = (chat) =>
  chat?.isGroup
    ? `${chat?.participants?.length || 0} members`
    : chat?.counterpart?.isOnline
      ? "Online"
      : chat?.counterpart?.lastSeen
        ? `Last seen ${formatDay(chat.counterpart.lastSeen)}`
        : "Offline";

const isImage = (mimeType = "") => mimeType.startsWith("image/");
const isVideo = (mimeType = "") => mimeType.startsWith("video/");
const isAudio = (mimeType = "") => mimeType.startsWith("audio/");

const EmptyState = ({ title, description, actionLabel, onAction }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center">
    <div className="rounded-3xl bg-[var(--accent)]/15 p-4 text-[var(--accent)]">
      <FaCommentsFallback />
    </div>
    <h3 className="text-xl font-semibold">{title}</h3>
    <p className="max-w-md text-sm text-[var(--text-muted)]">{description}</p>
    {actionLabel && onAction ? (
      <button
        type="button"
        onClick={onAction}
        className="mt-2 rounded-2xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
      >
        {actionLabel}
      </button>
    ) : null}
  </div>
);

function FaCommentsFallback() {
  return <FaUsers className="text-2xl" />;
}

const ChatPage = () => {
  const { user, token, clearUser, setUser } = useUserStore();
  const { theme, toggleTheme } = useThemeStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [chatResponse, setChatResponse] = useState({ items: [], page: 1, hasMore: true });
  const [activeChatId, setActiveChatId] = useState(null);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [messagePagination, setMessagePagination] = useState({});
  const [chatLoading, setChatLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingMap, setTypingMap] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    username: user?.username || "",
    bio: user?.bio || "",
    avatar: null,
  });
  const [attachmentsPanel, setAttachmentsPanel] = useState([]);
  const [groupMemberSearch, setGroupMemberSearch] = useState("");

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeChat = chatResponse.items.find((chat) => chat._id === activeChatId) || null;
  const activeMessages = messagesByChat[activeChatId] || [];

  const filteredChats = useMemo(() => {
    if (!deferredSearchTerm.trim()) return chatResponse.items;

    return chatResponse.items.filter((chat) => {
      const haystack = `${getChatTitle(chat)} ${chat?.counterpart?.username || ""} ${chat?.description || ""}`.toLowerCase();
      return haystack.includes(deferredSearchTerm.toLowerCase());
    });
  }, [chatResponse.items, deferredSearchTerm]);

  useEffect(() => {
    if (theme) {
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    setProfileForm((current) => ({
      ...current,
      name: user?.name || "",
      username: user?.username || "",
      bio: user?.bio || "",
    }));
  }, [user]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    loadChats();
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!token) return undefined;

    const socket = initializeSocket(token);

    const handlePresence = ({ userId, isOnline, lastSeen }) => {
      setChatResponse((current) => ({
        ...current,
        items: current.items.map((chat) => {
          if (chat.isGroup || !chat.counterpart || chat.counterpart._id !== userId) {
            return chat;
          }

          return {
            ...chat,
            counterpart: {
              ...chat.counterpart,
              isOnline,
              lastSeen,
            },
          };
        }),
      }));
    };

    const handleNewChat = (chat) => {
      setChatResponse((current) => ({
        ...current,
        items: [chat, ...current.items.filter((item) => item._id !== chat._id)],
      }));
    };

    const handleChatUpdated = (payload) => {
      if (!payload?.chatId && !payload?._id) return;
      const targetId = payload.chatId || payload._id;

      setChatResponse((current) => ({
        ...current,
        items: current.items.map((chat) => (chat._id === targetId ? { ...chat, ...payload } : chat)),
      }));
    };

    const handleNewMessage = (message) => {
      setMessagesByChat((current) => {
        const existing = current[message.chat] || [];
        if (existing.some((entry) => entry._id === message._id)) {
          return current;
        }

        return {
          ...current,
          [message.chat]: [...existing, message],
        };
      });

      setChatResponse((current) => ({
        ...current,
        items: current.items
          .map((chat) =>
            chat._id === message.chat
              ? {
                  ...chat,
                  lastMessage: message,
                  updatedAt: message.createdAt,
                  unreadCount:
                    activeChatId === chat._id || message.sender._id === user?._id
                      ? 0
                      : (chat.unreadCount || 0) + 1,
                }
              : chat,
          )
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
      }));

      if (activeChatId === message.chat && message.sender._id !== user?._id) {
        socket.emit("message:delivered", { chatId: message.chat, messageId: message._id });
        socket.emit("message:read", { chatId: message.chat, messageIds: [message._id] });
        markChatAsRead(message.chat).catch(() => {});
      }
    };

    const handleMessageUpdated = (message) => {
      setMessagesByChat((current) => ({
        ...current,
        [message.chat]: (current[message.chat] || []).map((entry) => (entry._id === message._id ? message : entry)),
      }));

      setChatResponse((current) => ({
        ...current,
        items: current.items.map((chat) =>
          chat._id === message.chat && chat.lastMessage?._id === message._id
            ? { ...chat, lastMessage: message }
            : chat,
        ),
      }));
    };

    const handleMessageDeleted = ({ chatId, messageId }) => {
      setMessagesByChat((current) => ({
        ...current,
        [chatId]: (current[chatId] || []).filter((entry) => entry._id !== messageId),
      }));
    };

    const handleTyping = ({ chatId, userId, isTyping }) => {
      if (userId === user?._id) return;
      setTypingMap((current) => ({
        ...current,
        [chatId]: isTyping ? userId : null,
      }));
    };

    const handleNotification = (notification) => {
      setNotifications((current) => [notification, ...current]);
      setUnreadNotifications((current) => current + 1);

      if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        new Notification(notification.title, { body: notification.body });
      }
    };

    socket.on("presence:update", handlePresence);
    socket.on("chat:created", handleNewChat);
    socket.on("chat:updated", handleChatUpdated);
    socket.on("message:new", handleNewMessage);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("typing:update", handleTyping);
    socket.on("notification:new", handleNotification);

    return () => {
      socket.off("presence:update", handlePresence);
      socket.off("chat:created", handleNewChat);
      socket.off("chat:updated", handleChatUpdated);
      socket.off("message:new", handleNewMessage);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("typing:update", handleTyping);
      socket.off("notification:new", handleNotification);
      disconnectSocket();
    };
  }, [token, activeChatId, user?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, activeChatId]);

  useEffect(() => {
    if (!activeChatId) return;
    loadMessages(activeChatId, 1, false);
    loadAttachments(activeChatId);

    const socket = initializeSocket(token);
    socket.emit("chat:join", { chatId: activeChatId });
    markChatAsRead(activeChatId).catch(() => {});

    setChatResponse((current) => ({
      ...current,
      items: current.items.map((chat) =>
        chat._id === activeChatId ? { ...chat, unreadCount: 0 } : chat,
      ),
    }));
  }, [activeChatId]);

  const loadChats = async (page = 1) => {
    try {
      if (page === 1) setChatLoading(true);
      const response = await getChats({ page, limit: 20 });
      setChatResponse((current) => ({
        items: page === 1 ? response.data : [...current.items, ...response.data],
        page,
        hasMore: response.pagination?.hasMore ?? false,
      }));

      if (page === 1 && response.data.length && !activeChatId) {
        setActiveChatId(response.data[0]._id);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load chats");
    } finally {
      setChatLoading(false);
    }
  };

  const loadMessages = async (chatId, page = 1, append = false) => {
    try {
      setMessageLoading(true);
      const response = await getMessages(chatId, { page, limit: 25 });
      setMessagesByChat((current) => ({
        ...current,
        [chatId]: append ? [...response.data, ...(current[chatId] || [])] : response.data,
      }));
      setMessagePagination((current) => ({
        ...current,
        [chatId]: {
          page,
          hasMore: response.pagination?.hasMore ?? false,
        },
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      setMessageLoading(false);
    }
  };

  const loadAttachments = async (chatId) => {
    try {
      const response = await getAttachments(chatId);
      setAttachmentsPanel(response.data);
    } catch {
      setAttachmentsPanel([]);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await getNotifications();
      setNotifications(response.data);
      setUnreadNotifications(response.meta?.unreadCount || 0);
    } catch {
      setNotifications([]);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!activeChatId) return;

    const formData = new FormData();
    formData.append("text", draft);
    selectedFiles.forEach((file) => formData.append("files", file));

    try {
      if (editingMessageId) {
        const response = await editMessage(activeChatId, editingMessageId, draft);
        setMessagesByChat((current) => ({
          ...current,
          [activeChatId]: (current[activeChatId] || []).map((entry) =>
            entry._id === response.data._id ? response.data : entry,
          ),
        }));
        setEditingMessageId(null);
        toast.success("Message updated");
      } else {
        await sendMessage(activeChatId, formData);
      }

      setDraft("");
      setSelectedFiles([]);
      setShowEmojiPicker(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!activeChatId) return;

    try {
      await deleteMessage(activeChatId, messageId);
      setMessagesByChat((current) => ({
        ...current,
        [activeChatId]: (current[activeChatId] || []).filter((entry) => entry._id !== messageId),
      }));
      toast.success("Message deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  };

  const handleUserSearch = async (search) => {
    setMemberSearch(search);
    try {
      const response = await searchUsers(search);
      setUserSearchResults(response.data);
    } catch {
      setUserSearchResults([]);
    }
  };

  const handleStartChat = async (targetUserId) => {
    try {
      const response = await createDirectChat(targetUserId);
      setChatResponse((current) => ({
        ...current,
        items: [response.data, ...current.items.filter((chat) => chat._id !== response.data._id)],
      }));
      setActiveChatId(response.data._id);
      setShowMemberModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start chat");
    }
  };

  const handleCreateGroup = async () => {
    try {
      const response = await createGroupChat({
        ...groupForm,
        memberIds: selectedGroupMembers,
      });

      setChatResponse((current) => ({
        ...current,
        items: [response.data, ...current.items],
      }));
      setActiveChatId(response.data._id);
      setShowGroupModal(false);
      setSelectedGroupMembers([]);
      setGroupForm({ name: "", description: "" });
      toast.success("Group created");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
    }
  };

  const handleProfileSave = async () => {
    try {
      const formData = new FormData();
      formData.append("name", profileForm.name);
      formData.append("username", profileForm.username);
      formData.append("bio", profileForm.bio);
      if (profileForm.avatar) formData.append("avatar", profileForm.avatar);

      const response = await updateProfile(formData);
      setUser(response.data, token);
      setShowProfileEditor(false);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } finally {
      clearUser();
      disconnectSocket();
    }
  };

  const handleGroupUpdate = async (payload) => {
    if (!activeChatId) return;
    try {
      const response = await updateGroup(activeChatId, payload);
      setChatResponse((current) => ({
        ...current,
        items: current.items.map((chat) => (chat._id === response.data._id ? response.data : chat)),
      }));
      toast.success("Group updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group");
    }
  };

  const handleLeaveOrDeleteGroup = async (action) => {
    if (!activeChatId) return;

    try {
      if (action === "delete") {
        await deleteGroup(activeChatId);
      } else {
        await leaveGroup(activeChatId);
      }

      setChatResponse((current) => ({
        ...current,
        items: current.items.filter((chat) => chat._id !== activeChatId),
      }));
      setActiveChatId(chatResponse.items.find((chat) => chat._id !== activeChatId)?._id || null);
      toast.success(action === "delete" ? "Group deleted" : "You left the group");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group membership");
    }
  };

  const openNotification = async (notification) => {
    try {
      await markNotificationRead(notification._id);
      setNotifications((current) =>
        current.map((item) => (item._id === notification._id ? { ...item, isRead: true } : item)),
      );
      setUnreadNotifications((current) => Math.max(0, current - (notification.isRead ? 0 : 1)));
      if (notification.chat?._id) {
        setActiveChatId(notification.chat._id);
      }
    } catch {
      // no-op
    }
  };

  const typingUserId = typingMap[activeChatId];
  const typingUser = activeChat?.participants?.find((participant) => participant._id === typingUserId);

  return (
    <div className="min-h-screen bg-[var(--bg)] px-3 py-3 text-[var(--text)] md:px-4">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1600px] grid-cols-1 gap-3 lg:grid-cols-[360px_minmax(0,1fr)_320px]">
        <aside className={`${activeChatId && window.innerWidth < 1024 ? "hidden" : "flex"} flex-col rounded-[2rem] border border-white/10 bg-[var(--bg-elevated)] p-4 backdrop-blur`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={user?.profilePicture || "https://placehold.co/80x80?text=CB"}
                alt={user?.name}
                className="h-12 w-12 rounded-2xl object-cover"
              />
              <div>
                <h1 className="font-semibold">{user?.name}</h1>
                <p className="text-sm text-[var(--text-muted)]">@{user?.username}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowProfileEditor(true)}
              className="rounded-2xl border border-white/10 p-3 text-[var(--text-muted)] transition hover:text-[var(--text)]"
            >
              <FaUserEdit />
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowMemberModal(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
            >
              <FaPlus />
              New chat
            </button>
            <button
              type="button"
              onClick={() => setShowGroupModal(true)}
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]"
            >
              Group
            </button>
          </div>

          <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <FaSearch className="text-[var(--text-muted)]" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search chats"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {chatLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="h-4 w-32 rounded bg-white/10" />
                  <div className="mt-3 h-3 w-48 rounded bg-white/10" />
                </div>
              ))
            ) : filteredChats.length ? (
              filteredChats.map((chat) => {
                const isActive = activeChatId === chat._id;
                return (
                  <button
                    key={chat._id}
                    type="button"
                    onClick={() => {
                      setActiveChatId(chat._id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full rounded-3xl border p-4 text-left transition ${
                      isActive
                        ? "border-[var(--accent)] bg-[var(--accent)]/12"
                        : "border-white/8 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={getChatAvatar(chat) || "https://placehold.co/80x80?text=CB"}
                        alt={getChatTitle(chat)}
                        className="h-12 w-12 rounded-2xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="truncate font-medium">{getChatTitle(chat)}</h3>
                          <span className="text-xs text-[var(--text-muted)]">
                            {chat.lastMessage?.createdAt ? formatTime(chat.lastMessage.createdAt) : ""}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{getChatSubtitle(chat)}</p>
                        <p className="mt-2 truncate text-sm text-[var(--text-muted)]">
                          {chat.lastMessage?.text || (chat.lastMessage?.attachments?.length ? "Attachment shared" : "No messages yet")}
                        </p>
                      </div>
                      {chat.unreadCount ? (
                        <span className="rounded-full bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-white">
                          {chat.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            ) : (
              <EmptyState
                title="No chats yet"
                description="Search for a teammate or create a group to begin your first conversation."
                actionLabel="Start a chat"
                onAction={() => setShowMemberModal(true)}
              />
            )}
          </div>

          {chatResponse.hasMore && !chatLoading ? (
            <button
              type="button"
              onClick={() => loadChats(chatResponse.page + 1)}
              className="mt-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]"
            >
              Load more chats
            </button>
          ) : null}

          <div className="mt-4 grid grid-cols-4 gap-2 rounded-3xl border border-white/10 bg-white/5 p-2">
            <button
              type="button"
              onClick={() => setShowNotifications((value) => !value)}
              className="relative rounded-2xl p-3 text-[var(--text-muted)] transition hover:bg-white/10 hover:text-[var(--text)]"
            >
              <FaBell />
              {unreadNotifications ? (
                <span className="absolute right-1 top-1 rounded-full bg-[var(--warning)] px-1.5 text-[10px] font-semibold text-black">
                  {unreadNotifications}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-2xl p-3 text-[var(--text-muted)] transition hover:bg-white/10 hover:text-[var(--text)]"
            >
              {theme === "dark" ? <FaSun /> : <FaMoon />}
            </button>
            <button
              type="button"
              onClick={() => setShowProfileEditor(true)}
              className="rounded-2xl p-3 text-[var(--text-muted)] transition hover:bg-white/10 hover:text-[var(--text)]"
            >
              <FaUserEdit />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-2xl p-3 text-[var(--text-muted)] transition hover:bg-rose-500/20 hover:text-rose-200"
            >
              <FaSignOutAlt />
            </button>
          </div>
        </aside>

        <main className="flex min-h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--bg-elevated)] backdrop-blur">
          {activeChat ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveChatId(null)}
                    className="rounded-2xl border border-white/10 p-3 text-[var(--text-muted)] lg:hidden"
                  >
                    <FaChevronLeft />
                  </button>
                  <img
                    src={getChatAvatar(activeChat) || "https://placehold.co/80x80?text=CB"}
                    alt={getChatTitle(activeChat)}
                    className="h-12 w-12 rounded-2xl object-cover"
                  />
                  <div>
                    <h2 className="text-lg font-semibold">{getChatTitle(activeChat)}</h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      {typingUser ? `${typingUser.name} is typing...` : getChatSubtitle(activeChat)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNotifications((value) => !value)}
                    className="rounded-2xl border border-white/10 p-3 text-[var(--text-muted)] transition hover:text-[var(--text)]"
                  >
                    <FaBell />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProfileEditor(true)}
                    className="rounded-2xl border border-white/10 p-3 text-[var(--text-muted)] transition hover:text-[var(--text)]"
                  >
                    <FaUserEdit />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-5">
                {messagePagination[activeChatId]?.hasMore ? (
                  <div className="mb-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        loadMessages(
                          activeChatId,
                          (messagePagination[activeChatId]?.page || 1) + 1,
                          true,
                        )
                      }
                      className="rounded-full border border-white/10 px-4 py-2 text-xs text-[var(--text-muted)] transition hover:text-[var(--text)]"
                    >
                      Load earlier messages
                    </button>
                  </div>
                ) : null}

                {messageLoading && !activeMessages.length ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="h-20 animate-pulse rounded-3xl bg-white/5" />
                    ))}
                  </div>
                ) : activeMessages.length ? (
                  <div className="space-y-4">
                    {activeMessages.map((message) => {
                      const ownMessage = message.sender?._id === user?._id;
                      return (
                        <div
                          key={message._id}
                          className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[82%] rounded-[1.75rem] border px-4 py-3 shadow-lg ${
                              ownMessage
                                ? "border-[var(--accent)]/30 bg-[var(--accent)]/15"
                                : "border-white/10 bg-white/5"
                            }`}
                          >
                            {!ownMessage ? (
                              <p className="mb-1 text-xs font-medium text-[var(--accent)]">
                                {message.sender?.name}
                              </p>
                            ) : null}

                            {message.text ? <p className="whitespace-pre-wrap text-sm">{message.text}</p> : null}

                            {message.attachments?.length ? (
                              <div className="mt-3 grid gap-3">
                                {message.attachments.map((attachment) => (
                                  <AttachmentCard key={attachment.publicId} attachment={attachment} />
                                ))}
                              </div>
                            ) : null}

                            <div className="mt-3 flex items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
                              <div className="flex items-center gap-2">
                                <span>{formatTime(message.createdAt)}</span>
                                {message.editedAt ? <span>(edited)</span> : null}
                              </div>
                              <div className="flex items-center gap-2">
                                {ownMessage ? (
                                  <span className="flex items-center gap-1">
                                    <FaCheck className="text-[10px]" />
                                    {message.delivery?.readCount
                                      ? "Read"
                                      : message.delivery?.deliveredCount
                                        ? "Delivered"
                                        : "Sent"}
                                  </span>
                                ) : null}
                                {ownMessage ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMessageId(message._id);
                                      setDraft(message.text || "");
                                    }}
                                    className="transition hover:text-[var(--text)]"
                                  >
                                    <FaPen />
                                  </button>
                                ) : null}
                                {(ownMessage || activeChat.admins?.some((admin) => admin._id === user?._id)) ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMessage(message._id)}
                                    className="transition hover:text-rose-300"
                                  >
                                    <FaTrash />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <EmptyState
                    title="No messages yet"
                    description="Start the conversation with a quick hello, an attachment, or create a shared thread for the team."
                  />
                )}
              </div>

              {selectedFiles.length ? (
                <div className="border-t border-white/10 px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    {selectedFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="max-w-44 truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))
                            }
                            className="text-[var(--text-muted)]"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleSendMessage} className="border-t border-white/10 px-4 py-4">
                <div className="flex items-end gap-3">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((value) => !value)}
                      className="rounded-2xl border border-white/10 p-3 text-[var(--text-muted)] transition hover:text-[var(--text)]"
                    >
                      🙂
                    </button>
                    {showEmojiPicker ? (
                      <div className="absolute bottom-14 left-0 grid w-48 grid-cols-5 gap-2 rounded-3xl border border-white/10 bg-[var(--bg-elevated)] p-3 shadow-2xl backdrop-blur">
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setDraft((current) => `${current}${emoji}`)}
                            className="rounded-xl p-2 text-lg transition hover:bg-white/10"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-2xl border border-white/10 p-3 text-[var(--text-muted)] transition hover:text-[var(--text)]"
                  >
                    <FaPaperclip />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                  />

                  <label className="flex-1 rounded-[1.75rem] border border-white/10 bg-white/5 px-4 py-3">
                    <textarea
                      value={draft}
                      onChange={(event) => {
                        setDraft(event.target.value);
                        const socket = initializeSocket(token);
                        socket.emit("typing:start", { chatId: activeChatId });
                        window.clearTimeout(window.__typingTimeout);
                        window.__typingTimeout = window.setTimeout(() => {
                          socket.emit("typing:stop", { chatId: activeChatId });
                        }, 1200);
                      }}
                      placeholder={editingMessageId ? "Edit your message" : "Type a message"}
                      rows={1}
                      className="max-h-40 w-full resize-none bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                    />
                  </label>

                  <button
                    type="submit"
                    className="rounded-2xl bg-[var(--accent)] p-4 text-white transition hover:bg-[var(--accent-strong)]"
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                title="Pick a conversation"
                description="Choose a chat from the sidebar, search for a teammate, or create a group to start collaborating."
                actionLabel="Start a chat"
                onAction={() => setShowMemberModal(true)}
              />
            </div>
          )}
        </main>

        <aside className="hidden overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--bg-elevated)] backdrop-blur lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-5 py-4">
            <h3 className="text-lg font-semibold">
              {showNotifications ? "Notifications" : activeChat ? "Chat details" : "Workspace"}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              {showNotifications
                ? "Keep track of new messages and unread activity."
                : activeChat
                  ? "Attachments, members, and shared context in one place."
                  : "Select a chat to see shared details."}
            </p>
          </div>

          {showNotifications ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-[var(--text-muted)]">{unreadNotifications} unread</span>
                <button
                  type="button"
                  onClick={async () => {
                    await markAllNotificationsRead();
                    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
                    setUnreadNotifications(0);
                  }}
                  className="text-sm text-[var(--accent)]"
                >
                  Mark all read
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
                {notifications.length ? (
                  notifications.map((notification) => (
                    <button
                      key={notification._id}
                      type="button"
                      onClick={() => openNotification(notification)}
                      className={`w-full rounded-3xl border p-4 text-left transition ${
                        notification.isRead
                          ? "border-white/10 bg-white/5"
                          : "border-[var(--accent)]/30 bg-[var(--accent)]/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium">{notification.title}</h4>
                        <span className="text-xs text-[var(--text-muted)]">
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-muted)]">{notification.body}</p>
                    </button>
                  ))
                ) : (
                  <div className="p-4">
                    <EmptyState
                      title="No notifications"
                      description="New message alerts and unread badges will show up here."
                    />
                  </div>
                )}
              </div>
            </div>
          ) : activeChat ? (
            <div className="flex h-full flex-col overflow-hidden">
              <div className="border-b border-white/10 px-5 py-5">
                <div className="flex items-center gap-4">
                  <img
                    src={getChatAvatar(activeChat) || "https://placehold.co/96x96?text=CB"}
                    alt={getChatTitle(activeChat)}
                    className="h-16 w-16 rounded-3xl object-cover"
                  />
                  <div>
                    <h4 className="text-lg font-semibold">{getChatTitle(activeChat)}</h4>
                    <p className="text-sm text-[var(--text-muted)]">{getChatSubtitle(activeChat)}</p>
                  </div>
                </div>
                {activeChat.description ? (
                  <p className="mt-4 text-sm text-[var(--text-muted)]">{activeChat.description}</p>
                ) : null}
              </div>

              {activeChat.isGroup ? (
                <div className="border-b border-white/10 px-5 py-4">
                  <div className="grid gap-3">
                    <input
                      value={groupMemberSearch}
                      onChange={(event) => setGroupMemberSearch(event.target.value)}
                      placeholder="Member id to add"
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-[var(--text-muted)]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleGroupUpdate({ action: "rename", name: activeChat.name, description: activeChat.description })}
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]"
                      >
                        Sync details
                      </button>
                      <button
                        type="button"
                        onClick={() => groupMemberSearch && handleGroupUpdate({ action: "add-member", memberId: groupMemberSearch })}
                        className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
                      >
                        Add member
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">Shared attachments</h5>
                  <span className="text-sm text-[var(--text-muted)]">{attachmentsPanel.length}</span>
                </div>
                <div className="mt-3 space-y-3">
                  {attachmentsPanel.slice(0, 5).map((attachment) => (
                    <a
                      key={`${attachment.publicId}-${attachment.messageId}`}
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    >
                      <AttachmentIcon mimeType={attachment.mimeType} />
                      <span className="truncate">{attachment.fileName}</span>
                    </a>
                  ))}
                  {!attachmentsPanel.length ? (
                    <p className="text-sm text-[var(--text-muted)]">No attachments shared yet.</p>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">Members</h5>
                  <span className="text-sm text-[var(--text-muted)]">{activeChat.participants?.length || 0}</span>
                </div>
                <div className="mt-3 space-y-3">
                  {activeChat.participants?.map((member) => (
                    <div key={member._id} className="rounded-3xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={member.profilePicture || "https://placehold.co/80x80?text=CB"}
                          alt={member.name}
                          className="h-11 w-11 rounded-2xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{member.name}</p>
                          <p className="truncate text-xs text-[var(--text-muted)]">@{member.username}</p>
                        </div>
                      </div>
                      {activeChat.isGroup ? (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleGroupUpdate({ action: "toggle-admin", memberId: member._id })}
                            className="rounded-2xl border border-white/10 px-3 py-2 text-xs text-[var(--text-muted)] transition hover:text-[var(--text)]"
                          >
                            Toggle admin
                          </button>
                          {member._id !== activeChat.owner?._id ? (
                            <button
                              type="button"
                              onClick={() => handleGroupUpdate({ action: "remove-member", memberId: member._id })}
                              className="rounded-2xl border border-rose-500/30 px-3 py-2 text-xs text-rose-200 transition hover:bg-rose-500/10"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {activeChat.isGroup ? (
                <div className="border-t border-white/10 px-5 py-4">
                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={() => handleLeaveOrDeleteGroup("leave")}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]"
                    >
                      Leave group
                    </button>
                    {activeChat.owner?._id === user?._id ? (
                      <button
                        type="button"
                        onClick={() => handleLeaveOrDeleteGroup("delete")}
                        className="rounded-2xl border border-rose-500/40 px-4 py-3 text-sm text-rose-200 transition hover:bg-rose-500/10"
                      >
                        Delete group
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                title="Details appear here"
                description="Select a chat to inspect members, attachments, and shared activity."
              />
            </div>
          )}
        </aside>
      </div>

      {showMemberModal ? (
        <Overlay title="Start a conversation" onClose={() => setShowMemberModal(false)}>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <FaSearch className="text-[var(--text-muted)]" />
            <input
              value={memberSearch}
              onChange={(event) => handleUserSearch(event.target.value)}
              placeholder="Search users by name, username, or email"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
            {userSearchResults.map((person) => (
              <button
                key={person._id}
                type="button"
                onClick={() => handleStartChat(person._id)}
                className="flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-white/20"
              >
                <img
                  src={person.profilePicture || "https://placehold.co/80x80?text=CB"}
                  alt={person.name}
                  className="h-12 w-12 rounded-2xl object-cover"
                />
                <div>
                  <p className="font-medium">{person.name}</p>
                  <p className="text-sm text-[var(--text-muted)]">@{person.username}</p>
                </div>
              </button>
            ))}
          </div>
        </Overlay>
      ) : null}

      {showGroupModal ? (
        <Overlay title="Create a group" onClose={() => setShowGroupModal(false)}>
          <div className="space-y-3">
            <input
              value={groupForm.name}
              onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Group name"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-[var(--text-muted)]"
            />
            <textarea
              value={groupForm.description}
              onChange={(event) => setGroupForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Group description"
              className="min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-[var(--text-muted)]"
            />
            <input
              value={memberSearch}
              onChange={(event) => handleUserSearch(event.target.value)}
              placeholder="Search and add members"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-[var(--text-muted)]"
            />
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {userSearchResults.map((person) => {
                const selected = selectedGroupMembers.includes(person._id);
                return (
                  <button
                    key={person._id}
                    type="button"
                    onClick={() =>
                      setSelectedGroupMembers((current) =>
                        selected ? current.filter((id) => id !== person._id) : [...current, person._id],
                      )
                    }
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      selected ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div>
                      <p className="font-medium">{person.name}</p>
                      <p className="text-sm text-[var(--text-muted)]">@{person.username}</p>
                    </div>
                    {selected ? <FaCheck className="text-[var(--accent)]" /> : null}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleCreateGroup}
              className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 font-medium text-white transition hover:bg-[var(--accent-strong)]"
            >
              Create group
            </button>
          </div>
        </Overlay>
      ) : null}

      {showProfileEditor ? (
        <Overlay title="Edit profile" onClose={() => setShowProfileEditor(false)}>
          <div className="space-y-3">
            <input
              value={profileForm.name}
              onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Full name"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
            />
            <input
              value={profileForm.username}
              onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value }))}
              placeholder="Username"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
            />
            <textarea
              value={profileForm.bio}
              onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))}
              placeholder="Bio"
              className="min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  avatar: event.target.files?.[0] || null,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={handleProfileSave}
              className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 font-medium text-white transition hover:bg-[var(--accent-strong)]"
            >
              Save profile
            </button>
          </div>
        </Overlay>
      ) : null}
    </div>
  );
};

const Overlay = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[var(--bg-elevated)] p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xl font-semibold">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 px-3 py-1 text-sm text-[var(--text-muted)]"
        >
          Close
        </button>
      </div>
      {children}
    </div>
  </div>
);

const AttachmentIcon = ({ mimeType }) => {
  if (isImage(mimeType)) return <FaImage className="text-[var(--accent)]" />;
  if (isVideo(mimeType)) return <FaVideo className="text-sky-300" />;
  if (isAudio(mimeType)) return <FaVolumeUp className="text-amber-300" />;
  return <FaFileAlt className="text-[var(--text-muted)]" />;
};

const AttachmentCard = ({ attachment }) => {
  if (isImage(attachment.mimeType)) {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl">
        <img
          src={attachment.url}
          alt={attachment.fileName}
          className="max-h-80 w-full rounded-2xl object-cover"
        />
      </a>
    );
  }

  if (isVideo(attachment.mimeType)) {
    return (
      <video controls className="max-h-80 w-full rounded-2xl">
        <source src={attachment.url} type={attachment.mimeType} />
      </video>
    );
  }

  if (isAudio(attachment.mimeType)) {
    return (
      <audio controls className="w-full">
        <source src={attachment.url} type={attachment.mimeType} />
      </audio>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
    >
      <AttachmentIcon mimeType={attachment.mimeType} />
      <div className="min-w-0 flex-1">
        <p className="truncate">{attachment.fileName}</p>
        <p className="text-xs text-[var(--text-muted)]">{Math.ceil(attachment.size / 1024)} KB</p>
      </div>
      <span className="text-xs text-[var(--accent)]">Download</span>
    </a>
  );
};

export default ChatPage;
