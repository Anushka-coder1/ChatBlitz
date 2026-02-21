import axios from 'axios'
import React, { useEffect, useState } from 'react'

const ChatPage = () => {
  const [ chats, setChats ] = useState([])

  useEffect( () => {
    const fetchChats = async () => {
    try {
      const { data } = await axios.get('/api/chat')
      setChats(data)
    } catch (error) {
      console.log(error)
    }
  }

    fetchChats()
  }, [])

  return<div>
    {chats.map((chat) => (
      <div key={chat._id}>{chat.chatName}</div>
    ))}
  </div>
}

export default ChatPage
