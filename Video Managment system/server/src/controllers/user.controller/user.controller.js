import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../../models/user.model.js";
import { uploadOncloudinary } from "../../utils/cloudinary.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = User.findById(userId);
    const access_token = await User.generateAccessToken();
    const refresh_token = await User.generateRefreshToken();

    user.refreshToken = refresh_token;
    await user.save({ validateBeforSave: false });

    return { access_token, refresh_token };
  } catch (err) {
    throw new ApiError(500, "something went wrong while genrating token", {});
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
    throw new ApiError();
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
  //field required
  if (!username && !email) {
    throw new ApiError(400, "Enter your username/email address and password");
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
  const { refresh_token, access_token } = await generateAccessAndRefreshToken(
    user._id,
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  // send cookie
  const options = {
    httpOnly: true,
    Secure: true,
  };
  // return
  return res
    .status(200)
    .cookie("access_token", access_token, options)
    .cookie("refresh_token", refresh_token, options)
    .json(
      new ApiResponse(200, {
        user: loggedInUser,
        access_token,
        refresh_token,
      }),
      "Logged In Successfully",
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
    req.user.id,
    { $set: { refreshToken: undefined } },
    { new: true },
  );

  const options = {
    httpOnly: true,
    Secure: true,
  };

  return res
    .status(204)
    .clearCookie("access_token", options)
    .clearCookie("refresh_token", options)
    .json(new ApiResponse(204, "Logged Out"));
});

export { registerUser, loginUser, logoutUser };
