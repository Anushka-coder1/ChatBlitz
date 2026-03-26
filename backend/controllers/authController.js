import User from "../models/userModel.js";
import otpGenerator from "../utils/otpGenerator.js";
import response from "../utils/responseHandler.js";

// send otp 
const sendOTP = async (req, res) => {
  const { phoneNumber, phoneSuffix } = req.body;
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
      await sendEmailOtp()
      return response(res , 200 , 'otp send to your email' , {email})
    }
    if (!phoneNumber || !phoneSuffix){
      return response(res , 400 , 'phone number and phone suffix is required');
    }
    const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`
    user = await User.findOne({ phoneNumber }); 
    if(!user){
      user = new User({ phoneNumber , phoneSuffix })
    }

    await user.save();

    return response(res , 200 , 'otp send successfully' , user)
  } catch (error) {
    console.error(error)
    return response(res , 500 , 'Internal server Error')
  }
}