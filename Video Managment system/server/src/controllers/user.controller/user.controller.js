import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import {User} from "../../models/user.model.js"
import {uploadOncloudinary} from "../../utils/cloudinary.js"
import {ApiResponse} from "../../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { fullName, email, password, username } = req.body;

  //validation
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
      throw new ApiError
    }
// check if user already exists:username,email
    
    const existedUser = await User.findOne({
      $or: [{ email }, { username }]
    })
    if (existedUser) {
      throw new ApiError(409,"User already exists");
    }
// upload them to cloudinary,avatar and coverImage
    
    const avatarLocalPath = await req.files?.avatar[0].path
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
console.log(req.files);

    if(!avatarLocalPath){
      throw new ApiError(400,"Avatar file is required")
    }
    
    const avatar = await uploadOncloudinary(avatarLocalPath)
    const coverImage = await uploadOncloudinary(coverImageLocalPath)

    if(!avatar){
      throw new ApiError(400,"Avatar file is required")
    }
    
    // create user object - create entry in db
   const user = await User.create({
      fullName,
      avatar: avatar.url,
      email,
      coverImage: coverImage?.url || "",
      username:username,
      password,

    })
    const createUser = await User.findById(user._id).select(
      // remove password and refresh token field from response
      "-password -refreshToken"
    )

    // check for user creation
    if(!createUser){
      throw new ApiError(500,'Server Error')
    }
    // return res

    console.table(req.body);
    return await res.status(201).json(

        new ApiResponse(200,createUser,"User rigistered  successfully")
    )

    
    
    
    
  });


export { registerUser };
