const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
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

module.exports = router;
