import { v2 as cloudinary } from "cloudinary";
import fs from "fs";


cloudinary.config({
  cloud_name:"avinashkumar",
  api_key:"269973458236725",
  api_secret:"pXLgvrmCK1WGNW2tDceHbHOZeo4",
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log(response.url);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnCloudinary };
