import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"


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
        $unset:{
          refreshTokens:1
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

const refereshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

   try {
    const decodedToken=jwt.verify(
       incomingRefreshToken,
       process.env.REFRESH_TOKEN_SECRET
     )
 
    const user=await User.findById(decodedToken?._id)
 
    if(!user){
     throw new ApiError(401,"Invalid token")
    }
 
    if (incomingRefreshToken !== user?.refreshTokens) {
      throw new ApiError(401,"Refersh token is expired")
    }
 
    const option={
     httpOnly:true,
     secure:true
    }
 
    const {accessToken,newRefreshToken}=await generateAccessAndRefereshTokens(user._id)
 
    return res.status(200)
    .cookie("accessToken",accessToken,option)
    .cookie("refreshToken",newRefreshToken,option)
    .json(
       new ApiResponse(
         200,
         "Access token generated successfully",
         {
           accessToken,
           refreshToken:newRefreshToken
         }
       )
    )
   } catch (error) {
     throw new ApiError(401,error.message||"Invalid token",)
   }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const {oldPassword, newPassword}=req.body

  const user=await User.findById(req.user?._id)

  const isPasswordCorrect=await req.user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(400,"Old password is incorrect")
  }

  user.password=newPassword
  await user.save({ validateBeforeSave: false })

  return res.status(200).json(
    new ApiResponse(
      200,
      "Password changed successfully",
      {}
    )
  )
})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      "User fetched successfully",
      req.user
    )
  )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const {fullName,email}=req.body

  if(!(fullName || email)){
    throw new ApiError(400,"All fields are required")
  }

  const user =await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullName,
        email
      }
    },
    {
      new:true
    }  
 ).select("-password")

 return res.status(200)
 .json(
   new ApiResponse(
     200,
     "Account details updated successfully",
     user
   )
 )
     
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is required")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"avatar not uploaded")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }
    )

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            "Avatar updated successfully",
            user
        )
    )
}) 

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath){
      throw new ApiError(400,"cover image file is required")
  }

  const coverImage=await uploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url){
      throw new ApiError(400,"cover image not uploaded")
  }

  const user=await User.findByIdAndUpdate(
      req.user?._id,
      {
          $set:{
              coverImage:coverImage.url
          }
      },
      {
          new:true
      }
  )

  return res.status(200)
  .json(
      new ApiResponse(
          200,
          "Cover image updated successfully",
          user
      )
  )
})

const getUserChannelProfile=asyncHandler(async(req, res)=>{
      const {username}=req.params

      if(!username?.trim()){
        throw new ApiError(400,"username is required")
      }

      const channel=await User.aggregate([
        {
          $match:{
            username:username?.trim()
          }
        },
        {
          $lookup:{
            from:"Subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
          }
        },
        {
          $lookup:{
            from:"Subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
          }
        },
        {
          $addFields:{
            subscribersCount:{
              $size:"$subscribers"
            },
            channelSubscribedToCount:{
              $size:"$subscribedTo"
            },
            isSubsribed:{
              $cond:{
                if:{ $in: [req.user?._id, "$subscribers.subscriber"]},
                then:true,
                else:false
              }
            }
          }
        },
        {
          $project:{
            fullName:1,
            username:1,
            avatar:1,
            subscribersCount:1,
            channelSubscribedToCount:1,
            isSubsribed:1,
            coverImage:1,
            email:1
          }
        }
      ])

      if(!channel?.length){
        throw new ApiError(404,"channe does not exist")
      }

      return res.status(200)
      .json(
        new ApiResponse(
          200,
          "Channel profile fetched successfully",
          channel[0]
        )
      )
})

const getWatchHistory=asyncHandler(async(req, res)=>{
   const user=await User.aggregate([
      {
        $match:{
          _id:new mongoose.Types.ObjectId(req.user._id)
        }
      },
      {
        $lookup:{
          from:"Videos",
          localField:"watchHistory",
          foreignField:"_id",
          as:"watchHistory",
          pipeline:[
            {
              $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                  {
                    $project:{
                      fullName:1,
                      username:1,
                      avatar:1
                    }
                  }
                ]
              }
            },
            {
              $addFields:{
                owner:{
                  $first:"$owner"
                }
              }
            }
          ]
        }
      },
   ])

   return res.status(200)
   .json(
     new ApiResponse(
       200,
       "Watch history fetched successfully",
       user[0].watchHistory
     )
   )
})

export {
   registerUser,
   loginUser,
   logoutUser,
   refereshAccessToken,
   changeCurrentPassword,
   getCurrentUser,
   updateAccountDetails,
   updateUserAvatar,
   updateUserCoverImage,
   getUserChannelProfile,
   getWatchHistory
}