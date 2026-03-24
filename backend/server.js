import dotenv from "dotenv"
dotenv.config();

import express from "express";
const app = express();

import  chats  from "./data/data.js";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js"
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import cookieParser from "cookie-parser";
import cors from "cors";

app.use(express.json());

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

app.use('/api/user',userRoutes)

app.use(notFound)
app.use(errorHandler)

const port = process.env.PORT || 8000;

//starting server and conecting to DB
const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`server starts on port ${port}`);
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

startServer();
