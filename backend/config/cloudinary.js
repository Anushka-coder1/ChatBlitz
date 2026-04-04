import { v2 as cloudinary } from 'cloudinary'
import multer from 'multer'
import fs from 'fs'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadFileToCloudinary = (file) => {
  const options = {
    resoure_type : file.mimetype.startwith('video') ? 'video' : 'image',
  }

  return new Promise((resolve , reject) => {
    const uploader = file.mimetype.startwith('video') ? cloudinary.uploader.upload_large : cloudinary.uploader.upload;
    uploader(file.path , options , (error,result) => {
      fs.unlink(file.path , () => {})
      if(error){
        return reject(error)
      }
      resolve(result)
    })
  })
}

const multerMiddleware = multer({dest : 'uploads/'}).single('media') 

export {multerMiddleware , uploadFileToCloudinary , cloudinary}