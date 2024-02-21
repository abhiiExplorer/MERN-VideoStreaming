import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: "abhiiexploreruploads",
    api_key: "736573667468648",
    api_secret: "JtDp_U9UXywlNwt-HQUsZGUP1xI",
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // Upload the file on Cloudinary using async/await
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        console.log("File is uploaded on Cloudinary: ", response.url);
        fs.unlinkSync(localFilePath);
        return response; // Return the response object
    } catch (error) {
        console.error("Error in file uploading:", error);
        fs.unlink(localFilePath, (err) => {
            if (err) console.error("Error removing file:", err);
            else console.log("Locally saved temporary file removed.");
        }); // Remove the locally saved temporary file as the upload operation failed.
        return null;
    }
};

export { uploadOnCloudinary };
