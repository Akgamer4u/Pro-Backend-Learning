import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js"
import dotenv from "dotenv"

dotenv.config()


export const verifyJWT=asyncHandler(async(req, _, next)=>{

   try {
    const token= req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer ","")

    console.log(token)
 
    if(!token){
      throw new ApiError(401,"unauthorized")
    }
 
    const decodedToken=jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
 
    console.log(decodedToken)
 
     const user= await User.findById(decodedToken._id).select("-password -refreshToken")

     console.log(user)
 
     if (!user) {
         throw new ApiError(401,"invalid token access")
     }
 
     req.user=user
 
     next()
   } catch (error) {
     throw new ApiError(401, error?.message || "invalid token access" )
   }
})