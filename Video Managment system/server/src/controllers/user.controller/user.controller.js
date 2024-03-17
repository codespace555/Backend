import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../../models/user.model.js";
import { uploadOncloudinary } from "../../utils/cloudinary.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(500, "something went wrong while genrating token");
  }
};
// ..................................................................

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { fullName, email, password, username } = req.body;

  //validation
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  // check if user already exists:username,email

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }
  // upload them to cloudinary,avatar and coverImage

  const avatarLocalPath = await req.files?.avatar[0].path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  console.log(req.files);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOncloudinary(avatarLocalPath);
  const coverImage = await uploadOncloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // create user object - create entry in db
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    email,
    coverImage: coverImage?.url || "",
    username: username,
    password,
  });
  const createUser = await User.findById(user._id).select(
    // remove password and refresh token field from response
    "-password -refreshToken",
  );

  // check for user creation
  if (!createUser) {
    throw new ApiError(500, "Server Error");
  }
  // return res

  console.table(req.body);
  return await res
    .status(201)
    .json(new ApiResponse(200, createUser, "User rigistered  successfully"));
});

// ..................................................................

const loginUser = asyncHandler(async (req, res) => {
  // req.body

  const { username, email, password } = req.body;

  console.log(username);
  //field required

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }
  //check user exist or not

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user) {
    throw new ApiError(401, "Invalid Credentials");
  }

  // password  verify
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Credentials");
  }
  // access and refersh token
  console.log(user._id);
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  // send cookie
  const options = {
    httpOnly: true,
    secure: true,
  };
  // return
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "Logged In Successfully",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  /*  
    req.body should containt :
    {
      refresh_token : '...'
    }
  */
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    },
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
    let user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = generateAccessAndRefreshToken(
      user._id,
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: refreshToken },
          "Access token refreshed",
        ),
      );
  } catch (error) {
    throw ApiError(403, error.message || "Server Error");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: true });

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "User Password Changed Successfully"));
});

const getCurrentuser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  //checking if the email has been changed or not
  if (!fullName || !email) {
    throw new ApiError(400, "Please provide required field");
  }

  const user = User.findByIdAndUpdate(req.user?._id, {
    $set: {
      fullName,
      email,
    },
  }).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile updated succesfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "No image provided");
  }

  const avatar = await uploadOncloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "No image path get");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true },
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "No cover image provided");
  }

  const coverImage = await uploadOncloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "No coverImage image path get");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true },
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const deleteUser = asyncHandler(async (req, res) => {
  try {
    const email = req.body;
    let user = await User.findById(req.user?._id);
    // Checking the owner of this account
    if (!(email === user.email)) {
      throw new ApiError(
        401,
        "You don't have permission to perform this action.",
      );
    }

    await User.deleteOne({ _id: user?._id });
    res.status(200).json(new ApiResponse(200, null, "Account deleted"));
  } catch (err) {
    new ApiError(400, err.message || "Server Error", err);
  }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required.", null);
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "Subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "Subscriber",
        as: "SubscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$Subscribers",
        },
        channelsSubscribersToCount: {
          $size: "$SubscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$Subscribers.Subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribersToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if(!channel?.length){
    throw  new ApiError(404,'Channel not found');
  }
  console.log(channel)

return res.status(200)
.json(
  new ApiResponse(200,channel[0],"User channel fetched successfully")
) 
});


const getWatchHistory = asyncHandler(async (req,res)=>{
   const user=  await User.aggregate([
    {
       $match:{
        _id: new mongoose.Types.ObjectId(req.user._id)
       }
    },
    {
      $lookup:{
        from:"videos",
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
                    username:1,
                    fullName:1,
                    avatar:1

                  }
                }
              ]
          }
        }
        ]
      }
    },{
      $addFields:{
        owner:{
          $first: "$owner"
        }
      }
    }
   ]) 

return res.status(200).json(new ApiResponse(200,user[0].watchHistory,"Watch history fetched successfully"))



})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentuser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  deleteUser,
  getUserChannelProfile,
  getWatchHistory

};
