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

module.exports = router;
