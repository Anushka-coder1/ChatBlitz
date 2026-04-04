import jwt from "jsonwebtoken";
import response from "../utils/responseHandler.js";

const authMiddleware = (req ,res , next)=>{
  const authToken =  req.cookies?.auth_token;

  if(!authToken){
    return response(res,401,'authorization token missing , please provide tokon')
  }

  try {
    const decode = jwt.verify(authToken , process.env.JWT_SECRET)
    console.log(decode)
    req.user = decode
    next();
  } catch (error) {
    console.error(error)
    return response(res,401,'invalid or expired token')
  }
}

export default authMiddleware