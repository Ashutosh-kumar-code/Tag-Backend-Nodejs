const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Video = require('../models/Video');
const router = express.Router();

// Admin Registration
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new Admin({ name, email, password: hashedPassword });
        await newAdmin.save();
        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, admin });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all creators and brands separately with filters
router.post('/users', async (req, res) => {
    try {
        const { role, name, topic, email } = req.body;
        const filter = {};
        if (role) filter.role = role;
        if (name) filter.name = { $regex: name, $options: 'i' };
        if (topic) filter.topic = topic;
        if (email) filter.email = email;

        const users = await User.find(filter);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin delete user profile
router.delete('/delete-user/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        await user.deleteOne();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin delete any video
// router.delete('/delete-video/:videoId', async (req, res) => {
//     try {
//         const video = await Video.findById(req.params.videoId);
//         if (!video) return res.status(404).json({ message: 'Video not found' });

//         await video.deleteOne();
//         res.json({ message: 'Video deleted successfully by admin' });
//     } catch (error) {
//         res.status(500).json({ message: 'Server error' });
//     }
// });


router.delete('/delete-video/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;

        // Find the video by ID
        const video = await Video.findById(videoId);
        if (!video) return res.status(404).json({ message: 'Video not found' });

        // Get video file path
        const videoPath = path.join(__dirname, '..', 'uploads', 'videos', path.basename(video.videoUrl));

        // Delete video file from uploads folder
        if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
        }

        // Remove the video from the database
        await Video.findByIdAndDelete(videoId);

        res.json({ message: 'Video deleted successfully by admin' });

    } catch (error) {
        console.error("Error deleting video:", error);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;
