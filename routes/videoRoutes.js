const express = require('express');
const Video = require('../models/Video');
const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');

const router = express.Router();

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'videos', // Folder in Cloudinary
        resource_type: 'video', // Ensure videos are properly uploaded
        format: async (req, file) => 'mp4', // Set default format
        public_id: (req, file) => Date.now(), // Unique filename
    },
});

const upload = multer({ storage });

// 🔹 Upload Video API (Fix for Vercel)
router.post('/post/creator', upload.single('videoFile'), async (req, res) => {
    try {
        const { creatorId, brandId, title, description, category, type, thumbnailUrl } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "No video file uploaded" });
        }

        console.log("Uploaded File:", req.file); // Debugging

        // Cloudinary returns `req.file.path.secure_url`
        const videoUrl = req.file.path || req.file.secure_url;

        if (!videoUrl) {
            return res.status(500).json({ message: "Error retrieving Cloudinary URL" });
        }

        // Save video data to MongoDB
        let newVideo;
        if (creatorId) {
            newVideo = new Video({ creatorId, title, description, videoUrl, thumbnailUrl, category, type });
        } else if (brandId) {
            newVideo = new Video({ brandId, title, description, videoUrl, thumbnailUrl, category, type });
        }

        await newVideo.save();

        res.status(201).json({ message: 'Video uploaded successfully', video: newVideo });

    } catch (error) {
        console.error("Error uploading video:", error);
        res.status(500).json({ message: 'Server error', error });
    }
});

// const storage = new CloudinaryStorage({
//     cloudinary: cloudinary,
//     params: {
//         folder: 'videos', // Folder name in Cloudinary
//         resource_type: 'video', // Video file type
//     },
// });

// const upload = multer({ storage });

// // Post a video or sort
// router.post('/post/creator', upload.single('videoFile'), async (req, res) => {
//     try {
//         const { creatorId,brandId, title, description, category, type, thumbnailUrl } = req.body;

//         if (!req.file) {
//             return res.status(400).json({ message: "No video file uploaded" });
//         }

//         // Save video data to MongoDB
//         var newVideo;
//         if(creatorId){
//          newVideo = new Video({ 
//             creatorId, 
//             title, 
//             description, 
//             videoUrl: req.file.path, // Cloudinary URL
//             thumbnailUrl, 
//             category, 
//             type 
//         });
//     }else if(brandId){
//          newVideo = new Video({ 
//             brandId, 
//             title, 
//             description, 
//             videoUrl: req.file.path, // Cloudinary URL
//             thumbnailUrl, 
//             category, 
//             type 
//         });
//     }

//         await newVideo.save();

//         res.status(201).json({ message: 'Video uploaded successfully', video: newVideo });

//     } catch (error) {
//         console.error("Error uploading video:", error);
//         res.status(500).json({ message: 'Server error', error });
//     }
// });




// Post a video by Brand
// router.post('/post/brand', async (req, res) => {
//     try {
//         const { brandId, title, description, videoUrl, thumbnailUrl, category, type } = req.body;
//         const newVideo = new Video({ brandId, title, description, videoUrl, thumbnailUrl, category, type });
//         await newVideo.save();
//         res.status(201).json({ message: 'Video posted by brand successfully', video: newVideo });
//     } catch (error) {
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// Post a video by Creator from Brand's profile
// router.post('/post/creator-from-brand', async (req, res) => {
//     try {
//         const { creatorId, brandId, title, description, videoUrl, thumbnailUrl, category, type } = req.body;
//         const newVideo = new Video({ creatorId, brandId, title, description, videoUrl, thumbnailUrl, category, type });
//         await newVideo.save();
//         res.status(201).json({ message: 'Video posted by creator from brand profile successfully', video: newVideo });
//     } catch (error) {
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// SHOW ALL VIDEOS LIST
router.get('/all', async (req, res) => {
    try {
        const videos = await Video.find();
        res.status(200).json(videos);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});


// Get all videos with optional filtering by category, type, creator, or brand
router.get('/list', async (req, res) => {
    try {
        const { category, type, creatorId, brandId } = req.query;
        const filter = {};
        if (category) filter.category = category;
        if (type) filter.type = type;
        if (creatorId) filter.creatorId = creatorId;
        if (brandId) filter.brandId = brandId;
        
        const videos = await Video.find(filter).populate('creatorId', 'name').populate('brandId', 'companyName');
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all short videos
router.get('/list/shorts', async (req, res) => {
    try {
        const shorts = await Video.find({ type: 'short' }).populate('creatorId', 'name').populate('brandId', 'companyName');
        res.json(shorts);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all long videos
router.get('/list/videos', async (req, res) => {
    try {
        const videos = await Video.find({ type: 'video' }).populate('creatorId', 'name').populate('brandId', 'companyName');
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE Video (Owner Only)
router.delete('/delete/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { userId } = req.body; // User making the request

        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            return res.status(400).json({ message: "Invalid videoId format" });
        }

        // Fetch the video
        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({ message: "Video not found" });
        }

        // Fetch the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if the user is the owner (creator/brand)
        if (
            (video.creatorId && video.creatorId.toString() === userId) ||
            (video.brandId && video.brandId.toString() === userId)
        ) {
            // 🔹 Delete the video file from Cloudinary
            if (video.videoUrl.startsWith("https://res.cloudinary.com/")) {
                const publicId = video.videoUrl.split('/').pop().split('.')[0]; // Extract Cloudinary public_id
                await cloudinary.uploader.destroy(`videos/${publicId}`, { resource_type: "video" });
            } 
            // 🔹 Delete the local file if stored locally
            else {
                const filePath = path.join(__dirname, '..', video.videoUrl);
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error("Error deleting file:", err);
                    }
                });
            }

            // 🔹 Delete from MongoDB
            await Video.findByIdAndDelete(videoId);
            return res.json({ message: "Video deleted successfully" });
        } else {
            return res.status(403).json({ message: "Unauthorized to delete this video" });
        }

    } catch (error) {
        console.error("Error deleting video:", error);
        res.status(500).json({ message: "Server error", error });
    }
});


// DELETE Video (Admin Only)
router.delete('/admin/delete/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { adminId } = req.body; // Admin making the request

         if (!adminId) {
            return res.status(400).json({ message: "Admin ID is required!" });
        }

        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            return res.status(400).json({ message: "Invalid videoId format" });
        }

        // Fetch the video
        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({ message: "Video not found" });
        }

        // Fetch admin data
        const admin = await User.findById(adminId);
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ message: "Only admin can delete videos" });
        }

        // 🔹 Delete from Cloudinary if it's a Cloudinary URL
        if (video.videoUrl.startsWith("https://res.cloudinary.com/")) {
            const publicId = video.videoUrl.split('/').pop().split('.')[0]; // Extract Cloudinary public_id
            await cloudinary.uploader.destroy(`videos/${publicId}`, { resource_type: "video" });
        } 
        // 🔹 Delete from Local Storage
        else {
            const filePath = path.join(__dirname, '..', video.videoUrl);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error("Error deleting file:", err);
                }
            });
        }

        // 🔹 Delete from MongoDB
        await Video.findByIdAndDelete(videoId);
        return res.json({ message: "Video deleted successfully by admin" });

    } catch (error) {
        console.error("Error deleting video:", error);
        res.status(500).json({ message: "Server error", error });
    }
});


module.exports = router;
