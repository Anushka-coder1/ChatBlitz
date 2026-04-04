import { uploadFileToCloudinary } from "../config/cloudinary"
import Conversation from "../models/conversation.model"
import Message from "../models/message.model"
import response from "../utils/responseHandler"

const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, messageStatus } = req.body
    const file = req.file
    const participants = [senderId, receiverId].sort()

    //check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: participants
    })

    if (!conversation) {
      conversation = new Conversation({
        participants
      })
      await conversation.save()
    }

    let imageOrVideoUrl = null
    let contentType = null

    //handle file upload
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file)

      if (!uploadFile?.secure_url) {
        return response(res, 400, 'failed to upload file')
      }

      imageOrVideoUrl = uploadFile?.secure_url

      if (file.mimetype.startWith('image')) {
        contentType = "image"
      }
      else if (file.mimetype.startWith('video')) {
        contentType = "video"
      }
      else {
        return response(res, 400, "Unsupported file type")
      }
    } else if (content?.trim()) {
      contentType = "text"
    }
    else {
      return response(res, 400, "messsage content is required")
    }

    const message = new Message({
      conversation: conversation?._id,
      sender: senderId,
      receiver: receiverId,
      content,
      contentType,
      imageOrVideoUrl,
      messageStatus
    })

    await message.save()

    if (message?.content) {
      conversation.lastMessage = message?.id
    }
    conversation.unreadCount += 1
    await conversation.save()

    const populatedMessage = await Message.findOne(message?.id)
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")

    return response(res, 201, "message send Successfully", populatedMessage)
  } catch (error) {
    return response(res, 500, 'Internal server Error')
  }
}

//get all conversation
const getConversation = async (req, res) => {
  const userId = req.user.userId
  try {
    let conversation = await Conversation.find({
      participants: userId
    }).populate("participants", "username profilePicture isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender receiver",
          select: "username profilePicture"
        }
      }).sort({ updatedAt: -1 })
    return response(res, 201, "conversation get successfully", conversation)
  } catch (error) {
    return response(res, 500, 'Internal server Error')
  }
}

//get messages of specific converstion
const getMessages = async (req, res) => {
  const { conversationId } = req.params
  const userId = req.user.userId
  try {
    const conversation = await Conversation.findById(conversationId)
    if (!conversation) {
      return response(res, 404, "Conversation not found")
    }

    if (!conversation.participants.includes(userId)) {
      return response(res, 403, "Not authorized to view this conversation")
    }

    const messages = await Message
      .find({ conversation: conversationId })
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .sort("createdAt")

    await Message.updateMany({
      conversation: conversationId,
      receiver: userId,
      messageStatus: { $in: ["send", "delivered"] },
    },
      {
        $set: {
          messageStatus: "read"
        }
      }
    )

    conversation.unreadCount = 0
    await conversation.save()

    return response(res, 200, "message retrived", messages)
  } catch (error) {
    return response(res, 500, 'Internal server Error')
  }
}

const markAsRead = async (req, res) => {
  const messageIds = req.body
  const userId = req.user.userId
  try {
    //get relavent message to determine senders
    let messages = await Messages.find({
      _id: { $in: messageIds },
      receiver: userId,
    })

    await messages.updateMany(
      {
        _id: { $in: messageIds } ,
        receiver: userId,
      },
      {$set : {messageStatus : "read"}}
    )

    return response (res , 200 , "message mark as read" , messages)
  } catch (error) {
    return response(res, 500, 'Internal server Error')
  }
}

const deleteMessage = async ( req ,res) => {
  const {messageId} = req.params
  const userId = req.user.userId
  try {
    const message = await Messages.findById(messageId)
    if(!message){
      return response(res , 404 , "message not found")
    }

    if(message.sender.toString() != userId){
      return response(res , 403 , "Not authorized to delete this message")
    }

    await message.deleteOne()

    return response(res , 200 , "message deleted successfully" )
  } catch (error) {
    return response(res, 500, 'Internal server Error')
  }
}

export { sendMessage, getConversation, getMessages, markAsRead ,deleteMessage }
