import { ApiError } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // Get user details
    const { userName, fullName, email, password } = req.body;

    // Validations
    // if (fullName === "") throw new ApiError(400, "Full Name is required.");
    if (
        [fullName, userName, email, password].some(
            (field) => field?.trime() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required.");
    }

    // Check if user already exist
    const userExistence = User.findOne({ $or: [{ userName }, { email }] });
    if (userExistence) {
        throw new ApiError(
            409,
            "User with email or username is already exists."
        );
    }

    // Check for images and Avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required.");

    // Upload files on Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const cover = await uploadOnCloudinary(coverImageLocalPath);
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

export { registerUser };
