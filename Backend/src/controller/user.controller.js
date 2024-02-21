import { ApiError } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating refresh and access token."
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // Get user details
    const { userName, fullName, email, password } = req.body;

    // Validations
    // if (fullName === "") throw new ApiError(400, "Full Name is required.");
    if (
        [fullName, userName, email, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required.");
    }

    // Check if user already exist
    const userExistence = await User.findOne({
        $or: [{ userName }, { email }],
    });
    if (userExistence) {
        throw new ApiError(
            409,
            "User with email or username is already exists."
        );
    }

    // Check for images and Avatar
    let coverImageLocalPath;
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required.");
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    // Upload files on Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatar)
        throw new ApiError(400, "Avater file is not uploaded on cloudinary");

    // Create User Object - create entry in DB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase(),
    });

    // Check for user creation
    // Remove password and refreshToken field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    if (!createdUser)
        throw new ApiError(
            500,
            "Something went wrong while registering the user."
        );

    // return response
    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered successfully.")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    // Get user details from frontend
    const { emai, userName, password } = req.body;

    // Check userName or email
    if (!userName || !emai)
        throw new ApiError(400, "Username or Email is required.");

    // Find the user
    const user = await User.findOne({
        $or: [{ userName }, { email }],
    });

    if (!user) throw new ApiError(404, "User does not exist.");

    // Password Check
    const isPasswordValid = user.isPasswordCorrect(password);
    if (!isPasswordValid) throw new ApiError(401, "Password is not correct.");

    // Access and Refresh Token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    // Send Cookie
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    const options = {
        httpOnly: true,
        secure: true,
    };
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
                "User logged in successfully."
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        { new: true }
    );
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"));
});

export { registerUser, loginUser, logoutUser };
