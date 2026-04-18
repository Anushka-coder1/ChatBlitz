import dotenv from "dotenv"
dotenv.config();

import express from "express";
const app = express();

import connectDB from "./config/db.js";
import userRoutes from "./routes/user.routes.js"
import authRoutes from "./routes/auth.routes.js"
import chatRoutes from "./routes/chat.routes.js"

import { errorHandler, notFound } from "./middleware/error.middleware.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import bodyParser from "body-parser";
import http from "http"
import { initializeSocket } from "./services/socket.service.js";
import statusRoutes from "./routes/status.routes.js";

const corsOption = {
  origin : process.env.FRONTEND_URL,
  Credentials : true
}

app.use(cors(corsOption))

//middleware
app.use(express.json()); //parse body data
app.use(cookieParser()) //parse token on every request
app.use(bodyParser.urlencoded({extended: true}))

//create server
const server = http.createServer(app)

const io = initializeSocket(server)
//apply socket middleware before routes
app.use((req,res,next) => {
  req.io = io 
  req.socketUserMap = io.socketUserMap
  next()
})

//routes
app.use('/api/auth',authRoutes)
app.use('/api/chat',chatRoutes)
app.get('/',(req,res)=>{
  res.send("API is running")
})
app.use('/api/status' ,statusRoutes)

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

const port = process.env.PORT || 5000;

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
