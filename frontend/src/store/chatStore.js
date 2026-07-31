import { getSocket } from "@/services/chat.service";
import axiosInstance from "@/services/url.service";
import { create } from "zustand";


export const useChatStore = create((set, get) => ({
  conversations: [], // list of all conversations
  currentConversation: null,
  messages: [],
  error: null,
  onlineUsers: new Map(),
  typingUsers: new Map(),


  // socket event listener setup
  initsocketListner: () => {
    const socket = getSocket()
    if (!socket) return;

    // remove existing listeners / events to prevent dublicate handlers
    socket.off("receive_message");
    socket.off("user_typing");
    socket.off("message_send");
    socket.off("message_error")
    socket.off("message_deleted")


    // listen for incomming message
    socket.on("receive_message", (message) => {

    })

    // confirm message delivery
    socket.on("message_send", (message) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === message._id ? { ...msg } : msg)
      }))

    })
    // update message
    socket.on("message_status_update", ({ messageId, messageStatus }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, messageStatus } : msg
        )
      }))
    })

    // handle reaction on messsage
    socket.on("reaction_update", ({ messageId, reaction }) => {
      set((state) => ({
        messages: state.messages.map((map) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        )
      }))
    })

    // handle remove message from local state
    socket.on("message_delete", ({ deletedMessageId }) => {
      set((state) => ({
        messages: state.messages.filter((msg) =>
          msg._id !== deletedMessageId
        )
      }))
    })

    // handle any message sending error
    socket.on("message_error", (error) => {
      console.error("message error", error)
    })

    // listner for typing users
    socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
      set((state) => {
        const newTypingUsers = new Map(state.typingUsers)
        if (!newTypingUsers.has(conversationId)) {
          newTypingUsers.set(conversationId, new Set())
        }
        const typingSet = newTypingUsers.get(conversationId)
        if (isTyping) {
          typingSet.add(userId)
        } else {
          typingSet.delete(userId)
        }

        return { typingUsers: newTypingUsers }
      })
    })

    // track users online and offline status
    socket.on("user_status", ({ userId, isonline, lastSeen }) => {
      set((state) => {
        const newOnlineUsers = new Map(state.onlineUsers)
        newOnlineUsers.set(userId, { isonline, lastSeen })
        return { onlineUsers: newOnlineUsers }
      })
    })

    //emit status check for all users in conversation list
    const { conversations } = get();
    if (conversations?.data?.length > 0) {
      conversations?.data?.forEach((conv) => {
        const otherUsers = conv.participants.find(
          (p) => p.id != get().currentUser._id
        )
        if (otherUsers._id) {
          socket.emit("get_user_status", otherUsers._id, (status) => {
            set((state) => {
              const newOnlineUsers = new Map(state.onlineUsers)
              newOnlineUsers.set(state.userId, {
                isonline: state.isonline,
                lastSeen: state.lastSeen
              })
              return { onlineUsers: newOnlineUsers }
            })
          })
        }
      });
    }

  },
  setCurrentUser: (user) => set({ currentUser: user }),

  fetchConversations: async () => {
    set({
      loading: true,
      error: null
    })
    try {
      const { data } = await axiosInstance.get("/chats/conversations")
      set({ conversations: data, loading: false })
      get().initsocketListner()
      return data
    } catch (error) {
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false
      })
      return null
    }
  },

  // fetch message for a conversation
  fetchMessages: async (conversationId) => {
    if (!conversationId) {
      return;
    }
    set({ loading: true, error: null })
    try {
      const { data } = await axiosInstance.get(`/chats/conversations/${conversationId}/messages`)
      const messageArray = data.data || data || []
      set({
        message: messageArray,
        currentConversation: conversationId,
        loading: false
      })

      //mark unread message as read
      const {markMessagesAsRead} = get(
        markMessagesAsRead()
      )

      return messageArray
    } catch (error) {
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false
      })
      return []
    }
  },

  // send message in real time
  sendMessage: async (formData) => {
    
  },

  receiveMessage: (message) => {
    if (!message) return;

    const { currentConversation, currentUser, messages } = get();
    const messageExist = message.some((msg) => msg._id === message._id)
    if (messageExist) return;

    if (message.conversation === currentConversation) {
      set((state) => ({
        message: [...state.messages, message]
      }))
      // automatically mark as read
      if(message.receiver?._id === currentUser?._id){
        get().markMessagesAsRead()
      }
    }

    // update conversation preview and unread count
    set((state) => {
      const updateConversations = state.conversation?.data?.map((conv) => {
        if (conv._id === message.conversation) {
          return {
            ...conv,
            lastMessage: message,
            unreadCount: message?.receiver?._id === currentUser?._id ? (conv.unreadCount || 0) + 1 : conv.unreadCount || 0
          }
        }
        return conv;
      })
      return {
        conversation : {
          ...state.conversations,
          data:updateConversations
        }
      }
    })
  },

  // mark as read
  markMessagesAsRead : async () => {
    const {messages , currentUser} = get();

    if(!messages.length || !currentUser) return
    const unreadIds = messages.filter((msg)=> msg.messageStatus !== 'read' && msg.receiver?._id === currentUser?._id).map((msg) => msg._id).filter(Boolean)

    if(!unreadIds.length === 0) return;

    try {
      const {data} = await axiosInstance.put("/chats/messsages/read" , {messageIds : unreadIds})
      set((state)=> ({
        messages:state.messages.map((msg)=> unreadIds.includes(msg._id)?{...msg , messageStatus:"read"} : msg)
      }))

      const socket = getSocket()
      if(socket){
        socket.emit('message_read',{
          messageIds:unreadIds,
          senderId:messages[0]?.sender?._id
        })
      }
    } catch (error) {
      console.error("failed to mark message as read" ,error)
    }
  },

  deleteMessage : async(messageId) => {
    try {
      await axiosInstance.delete(`/chats/message/${messageId}`)
      set((state) => ({
        messages:state.messages?.filter((msg) => msg?._id !==messageId)
      }))
      return true;
    } catch (error) {
      console.error("error in delete message" ,error)
      set({error:error.response?.data?.message || error.message})
      return false;
    }
  },

  // add or change reactions
  addReaction : async(messageId,emoji) => {
    const socket = getSocket()
    const {currentUser} = get()
    if(socket && currentUser){
      socket.emit("add_reaction" , {
        messageId,
        emoji,
        userId:currentUser?._id
      })
    }
  },

  startTyping : (receiverId) => {
    const {currentConversation} = get();
    const socket = getSocket()
    if(socket && currentConversation && receiverId){
      socket.emit("typing_start" , {
        conversationId:currentConversation,
        receiverId
      })
    }
  },
  stopTyping : (receiverId) => {
    const {currentConversation} = get();
    const socket = getSocket()
    if(socket && currentConversation && receiverId){
      socket.emit("typing_stop" , {
        conversationId:currentConversation,
        receiverId
      })
    }
  },
  isUserTyping : (userId) => {
     const {typingUsers , currentConversation} = get()
     if(!currentConversation || !typingUsers.has(currentConversation) || !userId){
      return false;
     }
     return typingUsers.get(currentConversation).has(userId)
  },
  isUserOnline: (userId) => {
    if(!userId) return null;
    const {onlineUsers} =get();
    return onlineUsers.get(userId)?.isOnline || false;
  },
  getUserLastSeen: (userId) => {
    if(!userId) return null;
    const {onlineUsers} =get();
    return onlineUsers.get(userId)?.isOnline || false;
  },
  cleanUp : () => {
    set({
      conversations: [], // list of all conversations
      currentConversation: null,
      messages: [],
      onlineUsers: new Map(),
      typingUsers: new Map(),
    })
  }
})) 