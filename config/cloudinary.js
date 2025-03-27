const cloudinary = require('cloudinary').v2;

cloudinary.config({
    // cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    // api_key: process.env.CLOUDINARY_API_KEY,
    // api_secret: process.env.CLOUDINARY_API_SECRET

    cloud_name: "dinrgqewt",
    api_key: "819296951889316",
    api_secret: "CskOlIN0nse1FrkOxXEaw5f99xs"
});

module.exports = cloudinary;
