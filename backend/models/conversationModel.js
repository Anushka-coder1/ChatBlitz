import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  participants:[{
    type : mongoose.Schema.Types.ObjectId,
    ref:'User'
  }],
  lastMessage : {
    type : mongoose.Schema.Types.ObjectId,
    ref:'Message'
  },
  unreadCount : {
    type:Number , 
    defauly :0
  },
},{Timestamp:true})

const Conversation = mongoose.model("conversation" , conversationSchema)

export default Conversation;