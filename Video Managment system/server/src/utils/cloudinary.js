import { v2 as cloudinary } from "cloudinary";
import fs, { unlinkSync } from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOncloudinary = async (localFilepath) => {
  try {
    if (!localFilepath) return "could not find the file";
    const resp = await cloudinary.uploader.upload(localFilepath, {
      resource_type: "auto",
    });
    console.log("Uploaded to Cloudinary", resp.url);
    return resp;
  } catch (error) {
    fs, unlinkSync(); // delete local copy of image after locally saved temporary file as the upload operation got failed
    return null;
  }
};

export {uploadOncloudinary}