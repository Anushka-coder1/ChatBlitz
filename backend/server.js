import dotenv from "dotenv"
dotenv.config();

import express from "express";
const app = express();

import  chats  from "./data/data.js";

app.get('/',(req,res)=>{
  res.send("API is running")
})

app.get('/api/chat',(req,res)=>{
  res.send(chats)
})

app.get('/api/chat/:id',(req,res)=>{
  const singlechat = chats.find((c)=>c._id===req.params.id)
  res.send(singlechat)
})

const port = process.env.PORT || 5000
app.listen(port,console.log(`server starts on port ${port}`));