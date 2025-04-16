const express = require('express');
const Video = require('../models/Video');
const User = require('../models/User');
const Admin = require('../models/Admin');
const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');
// const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');

const router = express.Router();


const videoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'videos',
      resource_type: 'video',
      format: async () => 'mp4',
      public_id: () => `video_${Date.now()}`
    }
  });
  
  const imageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'thumbnails',
      resource_type: 'image',
      format: async () => 'jpg',
      public_id: () => `thumbnail_${Date.now()}`
    }
  });
  
//   const uploadVideo = multer({ storage: videoStorage });
//   const uploadImage = multer({ storage: imageStorage });
  
  // Combine both
//   const uploadBoth = multer();

const videoUpload = multer({
    storage: multer.memoryStorage(),
  }).fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'thumbnailImage', maxCount: 1 }
  ]);



router.post('/post/creator', videoUpload, async (req, res) => {
  try {
    const { creatorId, brandId, title, description, category, type } = req.body;

    const videoFile = req.files?.videoFile?.[0];
    const thumbnailFile = req.files?.thumbnailImage?.[0];

    if (!videoFile) {
      return res.status(400).json({ message: "No video file uploaded" });
    }
    if (!videoFile?.buffer) {
        return res.status(400).json({ message: "Video file buffer not found" });
      }
      

    // Upload video
    const videoUploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'videos',
          resource_type: 'video',
          public_id: `video_${Date.now()}`
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      streamifier.createReadStream(videoFile.buffer).pipe(uploadStream);
    });

    let thumbnailUrl = '';
    if (thumbnailFile) {
      const thumbnailUploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'thumbnails',
            resource_type: 'image',
            public_id: `thumbnail_${Date.now()}`
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(thumbnailFile.buffer).pipe(uploadStream);
      });
      thumbnailUrl = thumbnailUploadResult.secure_url;
    }

    // Save to DB
    const newVideo = new Video({
      creatorId,
      brandId,
      title,
      description,
      videoUrl: videoUploadResult.secure_url,
      thumbnailUrl,
      category,
      type
    });

    await newVideo.save();

    res.status(201).json({ message: 'Video uploaded with thumbnail!', video: newVideo });

  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ message: 'Server error', error: err });
  }
});


// const storage = new CloudinaryStorage({
//     cloudinary: cloudinary,
//     params: {
//         folder: 'videos', // Folder in Cloudinary
//         resource_type: 'video', // Ensure videos are properly uploaded
//         format: async (req, file) => 'mp4', // Set default format
//         public_id: (req, file) => Date.now(), // Unique filename
//     },
// });

// const upload = multer({ storage });

// // 🔹 Upload Video API (Fix for Vercel)
// router.post('/post/creator', upload.single('videoFile'), async (req, res) => {
//     try {
//         const { creatorId, brandId, title, description, category, type, thumbnailUrl } = req.body;

//         if (!req.file) {
//             return res.status(400).json({ message: "No video file uploaded" });
//         }

//         console.log("Uploaded File:", req.file); // Debugging

//         // Cloudinary returns `req.file.path.secure_url`
//         const videoUrl = req.file.path || req.file.secure_url;

//         if (!videoUrl) {
//             return res.status(500).json({ message: "Error retrieving Cloudinary URL" });
//         }

//         // Save video data to MongoDB
//         let newVideo;
//         if (creatorId && brandId) {
//             newVideo = new Video({ creatorId, brandId, title, description, videoUrl, thumbnailUrl, category, type });
//         } else if (creatorId) {
//             newVideo = new Video({ creatorId, title, description, videoUrl, thumbnailUrl, category, type });
//         } else if (brandId) {
//             newVideo = new Video({ brandId, title, description, videoUrl, thumbnailUrl, category, type });
//         }

//         await newVideo.save();

//         res.status(201).json({ message: 'Video uploaded successfully', video: newVideo });

//     } catch (error) {
//         console.error("Error uploading video:", error);
//         res.status(500).json({ message: 'Server error', error });
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
router.post('/list', async (req, res) => {
    try {
        const { category,title, type, creatorId, brandId } = req.body;
   
        const filter = {};
      
        if (type) filter.type = type;
        if (creatorId) filter.creatorId = creatorId;
        if (brandId) filter.brandId = brandId;
        if (title) {
            filter.title = { $regex: title, $options: 'i' }; // 'i' = case-insensitive
        }
        if (category) {
            filter.category = { $regex: category, $options: 'i' };
        }
        
        const videos = await Video.find(filter).sort({ createdAt: -1 }).populate('creatorId', 'name').populate('brandId', 'companyName');
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
        const { userId } = req.body; // Ensure you're sending this in request body

        console.log("Request to delete video:", { videoId, userId });

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
        const isOwner =
            (video.creatorId && video.creatorId.toString() === userId) ||
            (video.brandId && video.brandId.toString() === userId);

        if (!isOwner) {
            return res.status(403).json({ message: "Unauthorized to delete this video" });
        }

        // 🔹 Delete the video file from Cloudinary
        if (video.videoUrl.startsWith("https://res.cloudinary.com/")) {
            const publicId = video.videoUrl.split('/').pop().split('.')[0]; // Ensure publicId is correct
            console.log("Deleting from Cloudinary:", publicId);

            await cloudinary.uploader.destroy(`videos/${publicId}`, {
                resource_type: "video",
            });
        } 
        // 🔹 Delete local file
        else {
            const filePath = path.join(__dirname, '..', video.videoUrl);
            console.log("Deleting local file at:", filePath);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Use sync version for reliability
            } else {
                console.warn("File not found locally:", filePath);
            }
        }

        // 🔹 Delete from MongoDB
        await Video.findByIdAndDelete(videoId);

        return res.json({ message: "Video deleted successfully" });

    } catch (error) {
        console.error("🔥 Error deleting video:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// router.delete('/delete/:videoId', async (req, res) => {
//     try {
//         const { videoId } = req.params;
//         const { userId } = req.body; // User making the request

//         if (!mongoose.Types.ObjectId.isValid(videoId)) {
//             return res.status(400).json({ message: "Invalid videoId format" });
//         }

//         // Fetch the video
//         const video = await Video.findById(videoId);
//         if (!video) {
//             return res.status(404).json({ message: "Video not found" });
//         }

//         // Fetch the user
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         // Check if the user is the owner (creator/brand)
//         if (
//             (video.creatorId && video.creatorId.toString() === userId) ||
//             (video.brandId && video.brandId.toString() === userId)
//         ) {
//             // 🔹 Delete the video file from Cloudinary
//             if (video.videoUrl.startsWith("https://res.cloudinary.com/")) {
//                 const publicId = video.videoUrl.split('/').pop().split('.')[0]; // Extract Cloudinary public_id
//                 await cloudinary.uploader.destroy(`videos/${publicId}`, { resource_type: "video" });
//             } 
//             // 🔹 Delete the local file if stored locally
//             else {
//                 const filePath = path.join(__dirname, '..', video.videoUrl);
//                 fs.unlink(filePath, (err) => {
//                     if (err) {
//                         console.error("Error deleting file:", err);
//                     }
//                 });
//             }

//             // 🔹 Delete from MongoDB
//             await Video.findByIdAndDelete(videoId);
//             return res.json({ message: "Video deleted successfully" });
//         } else {
//             return res.status(403).json({ message: "Unauthorized to delete this video" });
//         }

//     } catch (error) {
//         console.error("Error deleting video:", error);
//         res.status(500).json({ message: "Server error", error });
//     }
// });


// DELETE Video (Admin Only)
router.delete('/admin/delete/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { adminId } = req.query; // 🔹 Changed from req.body to req.query

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
        const admin = await Admin.findById(adminId);
        // console.log("===========", admin,adminId )
        if (!admin) {
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

// get videos for brand and user profile
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        // Fetch videos where the user is either a creator or a brand
        const videos = await Video.find({
            type: 'video',
            $or: [{ creatorId: userId }, { brandId: userId }]
        }).sort({ createdAt: -1 });

        res.status(200).json({ videos });

    } catch (error) {
        console.error("Error fetching videos:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// get shorts for brand and user profile
router.post('/user-sorts/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        // Fetch videos where the user is either a creator or a brand
        const videos = await Video.find({
            type: 'short',
            $or: [{ creatorId: userId }, { brandId: userId }]
        }).sort({ createdAt: -1 });

        res.status(200).json({ videos });

    } catch (error) {
        console.error("Error fetching videos:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// Increase views ( Call this route when the user starts watching the video )
router.post('/onevideo/:id/view', async (req, res) => {
    try {
        const video = await Video.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } }, // 👈 Increment the views
            { new: true }
        );

        if (!video) return res.status(404).json({ message: 'Video not found' });

        res.json({ message: 'View added', views: video.views });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});


module.exports = router;
