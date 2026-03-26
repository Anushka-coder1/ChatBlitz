import twilio from "twilio";

const getTwilioConfig = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const serviceSid = process.env.TWILIO_SERVICE_SID?.trim();

  return { accountSid, authToken, serviceSid };
}

const getMissingTwilioConfig = () => {
  const { accountSid, authToken, serviceSid } = getTwilioConfig();
  const missingConfig = [];

  if (!accountSid) {
    missingConfig.push("TWILIO_ACCOUNT_SID");
  }
  if (!authToken) {
    missingConfig.push("TWILIO_AUTH_TOKEN");
  }
  if (!serviceSid) {
    missingConfig.push("TWILIO_SERVICE_SID");
  }

  return missingConfig;
}

const getTwilioClient = () => {
  const { accountSid, authToken } = getTwilioConfig();
  return twilio(accountSid, authToken);
}

//send otp to phone number
const sendOtpToPhoneNumber = async (phoneNumber) => {
  try {
    console.log("sending otp to this phone number", phoneNumber)
    if (!phoneNumber) {
      throw new Error("phone number is required");
    }

    const missingConfig = getMissingTwilioConfig();
    if (missingConfig.length) {
      throw new Error(`Twilio is not configured. Missing: ${missingConfig.join(", ")}`);
    }

    const { serviceSid } = getTwilioConfig();
    const client = getTwilioClient();
    const response = await client.verify.v2.services(serviceSid).verifications.create({
      to: phoneNumber,
      channel: "sms"
    })
    console.log("this is my otp response", response)
    return response;
  } catch (error) {
    console.error(error);
    throw new Error(error.message || "Failed to send otp")
  }
}

const verifyOtp = async (phoneNumber, otp) => {
  try {
    console.log("sending otp to this phone number", phoneNumber)
    console.log("otp is ", otp)

    const missingConfig = getMissingTwilioConfig();
    if (missingConfig.length) {
      throw new Error(`Twilio is not configured. Missing: ${missingConfig.join(", ")}`);
    }

    const { serviceSid } = getTwilioConfig();
    const client = getTwilioClient();
    const response = await client.verify.v2.services(serviceSid).verificationChecks.create({
      to: phoneNumber,
      code: otp
    })
    console.log("this is my otp response", response)
    return response;
  } catch (error) {
    console.error(error);
    throw new Error(error.message || "otp verification failed")
  }
}

export { sendOtpToPhoneNumber, verifyOtp }
