const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Follow a creator
router.post('/follow/:creatorId', async (req, res) => {
    try {
        const { userId } = req.body;
        const creator = await User.findById(req.params.creatorId);
        const user = await User.findById(userId);

        if (!creator || !user) return res.status(404).json({ message: 'User not found' });
        
        if (!user.following.includes(creator._id)) {
            user.following.push(creator._id);
            await user.save();
        }

        res.json({ message: 'Followed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Unfollow a creator
router.post('/unfollow/:creatorId', async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.following = user.following.filter(id => id.toString() !== req.params.creatorId);
        await user.save();

        res.json({ message: 'Unfollowed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/is-following/:creatorId/:userId', async (req, res) => {
    try {
        const { creatorId, userId } = req.params;

        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: 'User not found' });

        const isFollowing = user.following.includes(creatorId);

        res.json({ isFollowing });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});


// Get total followed creators with some info
router.get('/following/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate('following', 'name email role');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ totalFollowing: user.following.length, following: user.following });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// get total followers of a user 
router.get('/followers/:userId', async (req, res) => {
    try {
        const followers = await User.find({ following: req.params.userId }).select('name email role');
        
        res.json({ totalFollowers: followers.length, followers });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get followers and following count of a user
router.get('/follow-counts/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Find the user
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Count followers
        const followersCount = await User.countDocuments({ following: userId });
        
        // Count following
        const followingCount = user.following.length;
        
        res.json({
            followers: followersCount,
            following: followingCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;
