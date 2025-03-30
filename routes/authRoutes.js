const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Video = require('../models/Video');
const router = express.Router();

// Signup Route
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role, companyName, website, bio, topic } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword, role, companyName, website, bio, topic });
        await newUser.save();

        const message = role === 'brand' ? 'Brand registered successfully' : 'Creator registered successfully';
        res.status(201).json({ message });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, companyName: user.companyName, website: user.website, bio: user.bio, topic: user.topic } });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});



// Update User Info
router.put('/update', async (req, res) => {
    try {
        const { userId, name, companyName, website, bio, topic } = req.body;
        const updatedUser = await User.findByIdAndUpdate(userId, { name, companyName, website, bio, topic }, { new: true });
        if (!updatedUser) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User info updated successfully', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Profile Info
router.get('/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Find user and exclude password field
        const user = await User.findById(userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});


// Delete Account
router.delete('/delete', async (req, res) => {
    try {
        const { userId } = req.body;
        const deletedUser = await User.findByIdAndDelete(userId);
        if (!deletedUser) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Dashboard bar graph api
router.get('/all-registrations-graph', async (req, res) => {
    try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const registrations = await User.aggregate([
            {
                $match: { createdAt: { $gte: oneYearAgo } } // Filter users registered in the last year
            },
            {
                $group: {
                    _id: { 
                        month: { $month: "$createdAt" }, 
                        year: { $year: "$createdAt" } 
                    },
                    totalBrands: { 
                        $sum: { $cond: [{ $eq: ["$role", "brand"] }, 1, 0] } 
                    },
                    totalCreators: { 
                        $sum: { $cond: [{ $eq: ["$role", "creator"] }, 1, 0] } 
                    }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 } // Sort by year and month
            }
        ]);

        const monthlyData = Array(12).fill({ brands: 0, creators: 0 });

        registrations.forEach((record) => {
            const index = record._id.month - 1;
            monthlyData[index] = {
                brands: record.totalBrands,
                creators: record.totalCreators,
            };
        });

        res.json({
            success: true,
            data: monthlyData,
        });
    } catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Dashboard droughnut graph api
router.get('/user-counts', async (req, res) => {
    try {
        const brandsCount = await User.countDocuments({ role: 'brand' });
        const creatorsCount = await User.countDocuments({ role: 'creator' });

        res.json({
            success: true,
            data: {
                brands: brandsCount,
                creators: creatorsCount,
            },
        });
    } catch (error) {
        console.error('Error fetching user counts:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// get counts of totals, show in dashboard 
router.get('/total-stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalCreators = await User.countDocuments({ role: 'creator' });
        const totalBrands = await User.countDocuments({ role: 'brand' });
        const totalVideos = await Video.countDocuments({ type: 'video' });
        const totalShorts = await Video.countDocuments({ type: 'short' });

        res.json({
            success: true,
            data: {
                totalUsers,
                totalCreators,
                totalBrands,
                totalVideos,
                totalShorts,
            },
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// get api of leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const creators = await User.find({ role: 'creator' })
            .select('name email following')
            .lean();

        const leaderboard = await Promise.all(
            creators.map(async (creator) => {
                const videoCount = await Video.countDocuments({ creatorId: creator._id });
                const followerCount = creator.following.length;

                const totalScore = videoCount + followerCount;

                return totalScore > 1
                    ? {
                          creatorId: creator._id,
                          name: creator.name,
                          email: creator.email,
                          videoCount,
                          followerCount,
                          totalScore,
                      }
                    : null;
            })
        );

        // Filter out null values and sort by totalScore (descending order)
        const filteredLeaderboard = leaderboard
            .filter((entry) => entry !== null)
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 50); // Limit to top 50

        res.json({ success: true, leaderboard: filteredLeaderboard });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
