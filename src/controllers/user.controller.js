import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    //validation for user details not empty
    // chaeck if user already exists using email or username
    //check for image : avatar or cover image
    //upload image to cloudinary,check avatar
    //creater user object-create entery in database
    //remove password and refresh token field from response
    //check for user creation
    //return response
    
    const{username,email,fullName,password}=req.body
    console.log(username)

     if([username,email,fullName,password].some((field)=>field?.trim()==="")){
             throw new ApiError(400,"All fields are required")
     }

     const existedUser=await User.findOne({
        $or:[{username},{email}]
     })

     console.log(existedUser)

     if(existedUser){
        throw new ApiError(409,"User already exists")
     }

     const avatarLocalPath=req.fiels?.avatar[0]?.path;
     const coverImageLocalPath=req.fiels?.coverImage[0]?.path;

     if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
     }
     
     const avatar=await uploadOnCloudinary(avatarLocalPath)
     const coverImage=await uploadOnCloudinary(coverImageLocalPath)
      console.log(avatar.url,coverImage.url)

      if(!avatar){
        throw new ApiError(400,"Avatar file is required")
      }

      const user= await User.create({
        fullName,
        username:username.toLowerCase(),
        email,
        password,
        avatar:avatar.url,
        coverImage:coverImage?.url || ""
      })

      console.log(user)

      const createdUser=await User.findById(user._id).select("-password -refreshToken")
      console.log(createdUser)

      if(!createdUser){
        throw new ApiError(500,"Something went wrong while creating user")
      }

     return res.status(201).json(
        new ApiResponse(
            201,
            "User created successfully",
            createdUser
        )
     )
});


export {registerUser}