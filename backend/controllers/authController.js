import User from "../models/userModel.js";
import otpGenerator from "../utils/otpGenerator.js";
import response from "../utils/responseHandler.js";
import sendOtpEmail from "../services/emailService.js";
import { sendOtpToPhoneNumber, verifyOtp as verifyTwilioOtp } from "../services/twilioService.js";
import { generateToken } from "../utils/generateToken.js";

// send otp 
const sendOTP = async (req, res) => {
  const { email , phoneNumber, phoneSuffix } = req.body;
  const otp = otpGenerator();
  const expiry = new Date(Date.now() + 5 * 60 * 1000)
  let user;
  try {
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        user = new User({ email })
      }
      user.emailOtp = otp;
      user.emailOtpExpiry = expiry;
      await user.save();
      await sendOtpEmail(email, otp);
      return response(res, 200, 'otp send to your email', { email })
    }
    if (!phoneNumber || !phoneSuffix) {
      return response(res, 400, 'phone number and phone suffix is required');
    }
    const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`
    user = await User.findOne({ phoneNumber });
    if (!user) {
      user = new User({ phoneNumber, phoneSuffix })
    }

    await sendOtpToPhoneNumber(fullPhoneNumber)
    await user.save();

    return response(res, 200, 'otp send successfully', user)
  } catch (error) {
    console.error(error)
    const statusCode = error.message?.includes("phone number is required") ? 400 : 500;
    return response(res, statusCode, error.message || 'Internal server Error')
  }
}

const verifyOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email, otp } = req.body
  try {
    let user;
    if (email) {
      user = await User.findOne({ email })
      if (!user) {
        return response(res, 404, 'User not found')
      }
      const now = new Date();
      if (!user.emailOtp || String(user.emailOtp) != String(otp) || now > new Date(user.emailOtpExpiry)) {
        return response(res, 400, 'Invalid or expired otp')
      }
      user.isVerified = true;
      user.emailOtp = null
      user.emailOtpExpiry = null
      await user.save();
    }
    else {
      if (!phoneNumber || !phoneSuffix) {
        return response(res, 400, 'phone number and phone suffix is required');
      }
      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`
      user = await User.findOne({phoneNumber}); 
      if(!user){
        return response(res, 404 , 'User not found')
      }
      const result = await verifyTwilioOtp(fullPhoneNumber,otp)
      if(result.status !== 'approved'){
        return response(res, 400, 'Invalid otp')
      }
      user.isVerified = true;
      await user.save();
    }

    const token = generateToken(user?._id);
    res.cookie("auth_token",token, {
      httpOnly : true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    })
    return response(res , 200 , 'Otp verified successfully' , {token , user})
  } catch (error) {
    console.error(error)
    const statusCode = error.message?.includes("phone number is required") ? 400 : 500;
    return response(res, statusCode, error.message || 'Internal server Error')
  }
}

export {sendOTP , verifyOtp}
