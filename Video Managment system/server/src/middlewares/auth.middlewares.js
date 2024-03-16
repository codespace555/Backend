import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model";



export const verifyJWT = asyncHandler( async(req, res, next) => {
   try {
     const token = req.cookies?.access_token || req.header("Authorization")?.replace("Bearer", "");
 
     if(!token){
         throw new ApiError(401, 'Unauthorized User');
     }
 
    const decodedToken =  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
     const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if (!user) {
            return next(new ApiError(404, 'Invalid Token User not found'))
        }
        req.user= user;
        next()
   } catch (error) {
    throw new ApiError(401,error?.message || "Server Error")
   }

})