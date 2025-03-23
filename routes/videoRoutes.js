const express = require('express');
const Video = require('../models/Video');
const router = express.Router();

// Post a video by Creator
router.post('/post/creator', async (req, res) => {
    try {
        const { creatorId, title, description, videoUrl, thumbnailUrl, category, type } = req.body;
        const newVideo = new Video({ creatorId, title, description, videoUrl, thumbnailUrl, category, type });
        await newVideo.save();
        res.status(201).json({ message: 'Video posted by creator successfully', video: newVideo });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

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