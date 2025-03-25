const express = require('express');
const Video = require('../models/Video');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');

const router = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/videos'); // Store videos in "uploads/videos"
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});

const upload = multer({ storage: storage });

// Post a video by Creator
router.post('/post/creator', upload.single('videoFile'), async (req, res) => {
    try {
        const { creatorId, title, description, category, type, thumbnailUrl } = req.body;

        // 🔹 Ensure `creatorId` is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(creatorId)) {
            return res.status(400).json({ message: "Invalid creatorId format" });
        }
        const creatorObjectId = new mongoose.Types.ObjectId(creatorId);

        // 🔹 Ensure a file was uploaded
        if (!req.file) {
            return res.status(400).json({ message: "No video file uploaded" });
        }

        // 🔹 Save the video in MongoDB
        const newVideo = new Video({ 
            creatorId: creatorObjectId, 
            title, 
            description, 
            videoUrl: `/uploads/videos/${req.file.filename}`, 
            thumbnailUrl, 
            category, 
            type 
        });

        await newVideo.save();

        res.status(201).json({ message: 'Video uploaded successfully', video: newVideo });

    } catch (error) {
        console.error("Error saving video:", error);
        res.status(500).json({ message: 'Server error', error });
    }
});

// Multer Storage Configuration
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'uploads/videos'); // Store videos in "uploads/videos"
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
//     }
// });

// const upload = multer({ storage: storage });

// // Post a video by Creator
// router.post('/post/creator', upload.single('videoFile'), async (req, res) => {
//     try {
//         const { creatorId, title, description, category, type, thumbnailUrl } = req.body;
        
//         // Convert creatorId to ObjectId
//         if (!mongoose.Types.ObjectId.isValid(creatorId)) {
//             return res.status(400).json({ message: "Invalid creatorId format" });
//         }
//         const creatorObjectId = new mongoose.Types.ObjectId(creatorId);

//         // Ensure thumbnail URL is provided
//         if (!thumbnailUrl) {
//             return res.status(400).json({ message: "thumbnailUrl is required" });
//         }

//         // Save the video
//         const newVideo = new Video({ 
//             creatorId: creatorObjectId, 
//             title, 
//             description, 
//             videoUrl: `/uploads/videos/${req.file.filename}`, 
//             thumbnailUrl, 
//             category, 
//             type 
//         });

//         await newVideo.save();
//         res.status(201).json({ message: 'Video uploaded successfully', video: newVideo });

//     } catch (error) {
//         res.status(500).json({ message: 'Server error', error });
//     }
// });

// Post a video by Brand
router.post('/post/brand', async (req, res) => {
    try {
        const { brandId, title, description, videoUrl, thumbnailUrl, category, type } = req.body;
        const newVideo = new Video({ brandId, title, description, videoUrl, thumbnailUrl, category, type });
        await newVideo.save();
        res.status(201).json({ message: 'Video posted by brand successfully', video: newVideo });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Post a video by Creator from Brand's profile
router.post('/post/creator-from-brand', async (req, res) => {
    try {
        const { creatorId, brandId, title, description, videoUrl, thumbnailUrl, category, type } = req.body;
        const newVideo = new Video({ creatorId, brandId, title, description, videoUrl, thumbnailUrl, category, type });
        await newVideo.save();
        res.status(201).json({ message: 'Video posted by creator from brand profile successfully', video: newVideo });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

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

// Delete a video by its creator or brand
router.delete('/delete/:videoId', async (req, res) => {
    try {
        const { userId, role } = req.body; // Assume userId and role are provided in request
        const video = await Video.findById(req.params.videoId);
        
        if (!video) return res.status(404).json({ message: 'Video not found' });

        if (video.creatorId && video.creatorId.toString() === userId) {
            await video.deleteOne();
            return res.json({ message: 'Video deleted by creator' });
        }

        if (video.brandId && video.brandId.toString() === userId) {
            // if (video.creatorId) {
            //     return res.status(403).json({ message: 'Only the brand can delete this video' });
            // }
            await video.deleteOne();
            return res.json({ message: 'Video deleted by brand' });
        }

        res.status(403).json({ message: 'Unauthorized to delete this video' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;