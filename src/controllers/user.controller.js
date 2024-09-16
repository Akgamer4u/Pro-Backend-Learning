import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const generateAccessAndRefereshTokens = async(userId) =>{
   try {
       const user=await User.findById(userId)
       const accessToken = user.generateAccessToken()
       
       const refreshToken = user.generateRefreshToken()

       user.refreshTokens = refreshToken
       
       await user.save({ validateBeforeSave: false })

       return { accessToken, refreshToken }

      } catch (error) {
       throw new ApiError(500, "Something went wrong while generating referesh and access token")
      }
}

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

  

     if(existedUser){
        throw new ApiError(409,"User already exists")
     }

     console.log(req.files)

     const avatarLocalPath=req.files?.avatar[0]?.path
   //   const coverImageLocalPath=req.files?.coverImage[0]?.path
     let coverImageLocalPath;
     if(req.files &&Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path 
     }
     
     if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is very required")
     }

      const userAvatar=await uploadOnCloudinary(avatarLocalPath)
      const userCoverImage=await uploadOnCloudinary(coverImageLocalPath)

      if(!userAvatar){
        throw new ApiError(400,"Avatar is required")
      }

       const user= await User.create({
        fullName,
        username:username.toLowerCase(),
        email,
        password,
        avatar:userAvatar.url,
        coverImage:userCoverImage?.url || "",
      })

     

      const createdUser=await User.findById(user._id).select("-password -refreshToken")
      

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

const loginUser = asyncHandler(async (req, res) => {
    //req body -data
    //username or email accesss
    //find the user is exists or not 
    //check for password
    //access and refresh token generate 
     // send coockie
     //return response

     const {email,username,password}=req.body;

     if(!username && !email){
        throw new ApiError(400,"username and password are required")
     }

    const user=await User.findOne({$or:[{username},{email}]})

    if(!user){
        throw new ApiError(404,"User not found")
    }

    const isPasswordCorrect=await user.isPasswordCorrect(password)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Incorrect password")
    }
    
    const { accessToken, refreshToken }=await generateAccessAndRefereshTokens(user._id)

    const loogedInUser=await User.findById(user._id).select("-password -refreshToken")
    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
      new ApiResponse(
        200,

         "User logged in successfully",

        {
          user: loogedInUser,accessToken,refreshToken
        }, 
      )
   )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set:{
          refreshTokens:undefined
        }
      },
      {
        new:true
      }  
   )

   const options={
    httpOnly:true,
    secure:true
   }
   return res.status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(
      new ApiResponse(
        {},
        "User logged out successfully",
        200
      )
   )
})


export {
   registerUser,
   loginUser,
   logoutUser
}