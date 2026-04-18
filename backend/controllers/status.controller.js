import { cloudinary, uploadFileToCloudinary } from "../config/cloudinary.js"
import Status from "../models/status.model.js"
import Message from "../models/message.model.js"
import response from "../utils/responseHandler.js"

const createStatus = async (req, res) => {
  try {
    const { content, contentType } = req.body
    const userId = req.user.userId
    const file = req.file

    let mediaUrl = null;
    let finalContentType = contentType || 'text';

    //handle file upload
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file)

      if (!uploadFile?.secure_url) {
        return response(res, 400, 'failed to upload file')
      }

      mediaUrl = uploadFile?.secure_url

      if (file.mimetype.startsWith('image')) {
        finalContentType = "image"
      }
      else if (file.mimetype.startsWith('video')) {
        finalContentType = "video"
      }
      else {
        return response(res, 400, "Unsupported file type")
      }
    } else if (content?.trim()) {
      finalContentType = "text"
    }
    else {
      return response(res, 400, "messsage content is required")
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const status = new Status({
      user: userId,
      content: mediaUrl || content,
      contentType: finalContentType,
      expiresAt
    })

    await status.save()

    const populatedStatus = await Status.findById(status?._id)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture")

    //emit socket event
    if (req.io && req.socketUserMap) {
      //Broadcast to all connecting users except createServer
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("new_status", populatedStatus)
        }
      }

    }

    return response(res, 201, "status created Successfully", populatedStatus)
  } catch (error) {
    console.error(error)
    return response(res, 500, 'Internal server Error')
  }
}

const getStatus = async (req, res) => {
  try {
    const status = await Status.find({
      expiredAt: { $gt: new Date() }
    })
      .populate("user", "username profile")
      .populate("viewers", "username profile")
      .sort({ createdAt: -1 })

    return response(res, 200, 'status retrived successfully')

  } catch (error) {
    console.error(error)
    return response(res, 500, 'Internal server Error')
  }
}

const viewStatus = async (req, res) => {
  const { statusId } = req.params
  const userId = req.user.userId
  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, 'status not found')
    }
    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId)
      await status.save()

      const updateStatus = await Status.findById(statusId)
        .populate("user", "username profile")
        .populate("viewers", "username profile")

      //emit socket event
      if (req.io && req.socketUserMap) {
        const statusOwnerSocketId = req.socketUserMap.get(status.user._id.toString())
        if (statusOwnerSocketId) {
          const viewData = {
            statusId,
            viewerId: userId,
            totalViewers: updateStatus.viewers.length,
            viewers: updateStatus.viewers
          }

          res.io.to(statusOwnerSocketId).emit("status_viewed", viewData)
        } else {
          console.log("status owner not connected")
        }

      }
    } else {
      console.log("user already viewed the status")
    }

    return response(res, 200, 'status viewed successfully', status)
  } catch (error) {
    console.error(error)
    return response(res, 500, 'Internal server Error')
  }
}

const deleteStatus = async (req, res) => {
  const { statusId } = req.params
  const userId = req.user.userId
  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, 'status not found')
    }
    if (status.user.toString() != userId) {
      return response(res, 403, "not authorized to delete the status")
    }

    await status.deleteOne();

    if (req.io && req.socketUserMap) {
      //Broadcast to all connecting users except createServer
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("status_deleted", statusId)
        }
      }

    }

    return response(res, 200, "status deleted successfully")
  } catch (error) {
    console.error(error)
    return response(res, 500, 'Internal server Error')
  }
}

export { createStatus, getStatus, viewStatus, deleteStatus }
