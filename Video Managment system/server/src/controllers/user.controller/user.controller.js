import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import {User} from "../../models/user.model.js"
import {uploadOncloudinary} from "../../utils/cloudinary.js"

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
    
    const existedUser = User.findOne({
      $or: [{ email }, { username }]
    })
    if (existedUser) {
      throw new ApiError(409,"User already exists");
    }
// upload them to cloudinary,avatar and coverImage
    
    const avatarLocalPath = req.files?.avatar[0].path
    const coverImageLocalPath = req.files?.coverImage[0].path
    
    if(!avatarLocalPath){
      throw new ApiError(400,"Avatar file is required")
    }
    
    const avatar = await uploadOncloudinary(avatarLocalPath)
    const coverImage = await uploadOncloudinary(coverImageLocalPath)

    if(avatar){
      throw new ApiError(400,"Avatar file is required")
    }
    
    User.create({
      fullName,
      email,
      username:user,
      password,
      avatar: avatar.url,

    })
     // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    
    
    
    
    // console.log(req.body);
  });


export { registerUser };
