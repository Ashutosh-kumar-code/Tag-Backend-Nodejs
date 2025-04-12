const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Video = require('../models/Video');
const VerificationToken = require('../models/VerificationToken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const router = express.Router();


const storage = multer.memoryStorage(); // store file in memory
const upload = multer({ storage });



// Example transporter setup (Use real credentials in production)
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'ashutosh.wevdev@gmail.com',
        pass: 'buxe fsep bscv vwdb'
    }
});
// const transporter = nodemailer.createTransport({
//     host: 'smtp.gmail.com',
//     port: 587, // ⚠️ Try port 587 instead of 465
//     secure: false, // false = TLS, not SSL
//     auth: {
//       user: "ashutosh.wevdev@gmail.com",
//       pass: "buxe fsep bscv vwdb"
//     }
//   });



// Signup Route
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role, companyName, website, bio, topic } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name, email, password: hashedPassword, role,
            companyName, website, bio, topic, isVerified: false
        });
        await newUser.save();

        // Create verification token
        const token = crypto.randomBytes(32).toString('hex');
        const verificationToken = new VerificationToken({
            userId: newUser._id,
            token
        });
        await verificationToken.save();

        const verificationUrl = `https://tag-backend.vercel.app/verify-email/${token}`;

        // Send email
        await transporter.sendMail({
            from: '"SignUp Team" <your_email@gmail.com>',
            to: email,
            subject: 'Verify your email',
            html: `<h2>Hello ${name}</h2>
               <p>Please click the link below to verify your email:</p>
               <a href="${verificationUrl}">Verify Email</a>`
        });

        res.status(201).json({ message: 'Signup successful. Please check your email to verify your account.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


router.get('/verify-email/:token', async (req, res) => {
    try {
        const tokenDoc = await VerificationToken.findOne({ token: req.params.token });
        if (!tokenDoc) return res.status(400).json({ message: 'Invalid or expired token' });

        await User.findByIdAndUpdate(tokenDoc.userId, { isVerified: true });
        await VerificationToken.deleteOne({ _id: tokenDoc._id });

        res.status(200).json({ message: 'Email verified successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        // ✅ Add this check
        if (!user.isVerified) {
            return res.status(401).json({ message: 'Please verify your email before logging in.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyName: user.companyName,
                website: user.website,
                bio: user.bio,
                topic: user.topic
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});


// router.post('/signup', async (req, res) => {
//     try {
//         const { name, email, password, role, companyName, website, bio, topic } = req.body;
//         const existingUser = await User.findOne({ email });
//         if (existingUser) return res.status(400).json({ message: 'User already exists' });

//         const hashedPassword = await bcrypt.hash(password, 10);
//         const newUser = new User({ name, email, password: hashedPassword, role, companyName, website, bio, topic });
//         await newUser.save();

//         const message = role === 'brand' ? 'Brand registered successfully' : 'Creator registered successfully';
//         res.status(201).json({ message });
//     } catch (error) {
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// Login Route
// router.post('/login', async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         const user = await User.findOne({ email });
//         if (!user) return res.status(400).json({ message: 'Invalid credentials' });

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

//         const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
//         res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, companyName: user.companyName, website: user.website, bio: user.bio, topic: user.topic } });
//     } catch (error) {
//         res.status(500).json({ message: 'Server error' });
//     }
// });



// Update User Info
router.put('/update', upload.single('image'), async (req, res) => {
    try {
        const { userId, name, companyName, website, bio, topic } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        let updateData = { name, companyName, website, bio, topic };

        // If image is provided
        if (req.file) {
            const result = await cloudinary.uploader.upload_stream(
                { folder: 'user_profiles' },
                (error, result) => {
                    if (error) {
                        console.error("Cloudinary Upload Error:", error);
                        return res.status(500).json({ message: "Image upload failed", error });
                    }

                    updateData.image = result.secure_url;

                    // Perform update after image upload
                    User.findByIdAndUpdate(userId, updateData, { new: true })
                        .then(updatedUser => {
                            if (!updatedUser) {
                                return res.status(404).json({ message: 'User not found' });
                            }
                            return res.json({ message: 'User info updated successfully', user: updatedUser });
                        })
                        .catch(err => {
                            console.error("MongoDB Update Error:", err);
                            return res.status(500).json({ message: 'Failed to update user' });
                        });
                }
            );

            // Pipe file buffer to cloudinary upload stream
            require('streamifier').createReadStream(req.file.buffer).pipe(result);
        } else {
            // No image, just update other fields
            const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
            if (!updatedUser) return res.status(404).json({ message: 'User not found' });
            res.json({ message: 'User info updated successfully', user: updatedUser });
        }

    } catch (error) {
        console.error("Error in update:", error);
        res.status(500).json({ message: 'Server error', error });
    }
});

// router.put('/update', async (req, res) => {
//     try {
//         const { userId, name, companyName, website, bio, topic } = req.body;
//         const updatedUser = await User.findByIdAndUpdate(userId, { name, companyName, website, bio, topic }, { new: true });
//         if (!updatedUser) return res.status(404).json({ message: 'User not found' });
//         res.json({ message: 'User info updated successfully', user: updatedUser });
//     } catch (error) {
//         res.status(500).json({ message: 'Server error' });
//     }
// });

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
            .select('name email image')
            .lean();

        const leaderboard = await Promise.all(
            creators.map(async (creator) => {
                const videos = await Video.find({ creatorId: creator._id }).lean();

                let totalLikes = 0;
                let totalComments = 0;
                let totalViews = 0;

                videos.forEach((video) => {
                    totalLikes += video.likes.length;
                    totalComments += video.comments.length;
                    totalViews += video.views || 0;
                });

                // Calculate total points
                const totalPoints = totalViews * 1 + totalLikes * 2 + totalComments * 3;

                // Exclude if totalPoints < 10
                if (totalPoints < 10) return null;

                return {
                    creatorId: creator._id,
                    name: creator.name,
                    email: creator.email,
                    image: creator.image,
                    totalLikes,
                    totalComments,
                    totalViews,
                    totalPoints
                };
            })
        );

        const filteredLeaderboard = leaderboard
            .filter((entry) => entry !== null)
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, 50); // Top 50 only

        res.json({ success: true, leaderboard: filteredLeaderboard });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
