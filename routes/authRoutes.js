const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Video = require('../models/Video');
const VerificationToken = require('../models/VerificationToken');
const PasswordResetToken = require('../models/PasswordResetToken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const mongoose = require("mongoose");

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

        const verificationUrl = `https://tag-backend.vercel.app/api/auth/verify-email/${token}`;

        // Send email
        await transporter.sendMail({
            from: '"Tag Team" <your_email@gmail.com>',
            to: email,
            subject: 'Verify your email - New Link',
            html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; padding: 20px;">
              <div style="max-width: 600px; margin: auto; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                <div style="background: #6a0dad; color: white; padding: 20px 30px;">
                  <h1 style="margin: 0; font-size: 20px;">Tag App - Email Verification</h1>
                </div>
                <div style="padding: 30px;">
                  <h2 style="color: #333;">Hello ${name},</h2>
                  <p style="font-size: 16px; color: #555;">Thank you for signing up with <strong>Tag App</strong>.</p>
                  <p style="font-size: 16px; color: #555;">To complete your registration, please verify your email by clicking the button below:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background-color: #6a0dad; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; display: inline-block;">
                      Verify Email
                    </a>
                  </div>
                  <p style="font-size: 14px; color: #888;">If you did not request this, please ignore this email.</p>
                  <p style="font-size: 14px; color: #888;">— Tag App Team</p>
                </div>
              </div>
              <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #aaa;">
                <p>&copy; ${new Date().getFullYear()} Tag App. All rights reserved.</p>
              </div>
            </div>
            `
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
      if (!tokenDoc) {
        return res.status(400).send(`
          <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 50px;">
            <div style="max-width: 600px; margin: auto; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
              <div style="background-color: #ff4d4d; color: white; padding: 20px; text-align: center;">
                <h2>Verification Failed</h2>
              </div>
              <div style="padding: 30px; text-align: center;">
                <p style="font-size: 16px; color: #555;">The verification link is invalid or has expired.</p>
                </div>
            </div>
          </div>
        `);
      }
  
      await User.findByIdAndUpdate(tokenDoc.userId, { isVerified: true });
      await VerificationToken.deleteOne({ _id: tokenDoc._id });
  
      return res.status(200).send(`
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 50px;">
          <div style="max-width: 600px; margin: auto; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #6a0dad; color: white; padding: 20px; text-align: center;">
              <h2>Email Verified Successfully 🎉</h2>
            </div>
            <div style="padding: 30px; text-align: center;">
              <p style="font-size: 16px; color: #555;">Your email has been verified successfully. You can now log in to your account.</p>
             </div>
          </div>
        </div>
      `);
    } catch (error) {
      console.error(error);
      res.status(500).send(`
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 50px;">
          <div style="max-width: 600px; margin: auto; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #ff4d4d; color: white; padding: 20px; text-align: center;">
              <h2>Server Error</h2>
            </div>
            <div style="padding: 30px; text-align: center;">
              <p style="font-size: 16px; color: #555;">Something went wrong on our end. Please try again later.</p>
            </div>
          </div>
        </div>
      `);
    }
  });
  

router.post('/resend-verification', async (req, res) => {
    try {
      const { email } = req.body;
  
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      // Check if already verified
      if (user.isVerified) return res.status(400).json({ message: 'Email already verified' });
  
      // Remove old token (optional: prevent clutter)
      await VerificationToken.deleteMany({ userId: user._id });
  
      // Create new verification token
      const token = crypto.randomBytes(32).toString('hex');
      const verificationToken = new VerificationToken({
        userId: user._id,
        token
      });
      await verificationToken.save();
  
      const verificationUrl = `https://tag-backend.vercel.app/api/auth/verify-email/${token}`;
  
      // Send email
      await transporter.sendMail({
        from: '"Tag Team" <your_email@gmail.com>',
        to: email,
        subject: 'Verify your email - New Link',
        html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: #6a0dad; color: white; padding: 20px 30px;">
              <h1 style="margin: 0; font-size: 20px;">Tag App - Email Verification</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #333;">Hello ${user.name},</h2>
              <p style="font-size: 16px; color: #555;">Thank you for signing up with <strong>Tag App</strong>.</p>
              <p style="font-size: 16px; color: #555;">To complete your registration, please verify your email by clicking the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background-color: #6a0dad; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; display: inline-block;">
                  Verify Email
                </a>
              </div>
              <p style="font-size: 14px; color: #888;">If you did not request this, please ignore this email.</p>
              <p style="font-size: 14px; color: #888;">— Tag App Team</p>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #aaa;">
            <p>&copy; ${new Date().getFullYear()} Tag App. All rights reserved.</p>
          </div>
        </div>
        `
      });
      
  
      res.status(200).json({ message: 'Verification email sent again. Please check your inbox.' });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

// router.post('/login', async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         const user = await User.findOne({ email });
//         if (!user) return res.status(400).json({ message: 'Invalid credentials' });

//         // ✅ Add this check
//         if (!user.isVerified) {
//             return res.status(401).json({ message: 'Please verify your email before logging in.' });
//         }

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

//         const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

//         res.json({
//             token,
//             user: {
//                 id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 role: user.role,
//                 companyName: user.companyName,
//                 website: user.website,
//                 bio: user.bio,
//                 topic: user.topic
//             }
//         });
//     } catch (error) {
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// ==============================================================

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
                    totalLikes += video.likes?.length;
                    totalComments += video.comments?.length;
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


// POST /forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: 'User not found' });
  
      const existingToken = await PasswordResetToken.findOne({ userId: user._id });
      if (existingToken) await existingToken.deleteOne();
  
      const token = crypto.randomBytes(32).toString('hex');
      const resetToken = new PasswordResetToken({ userId: user._id, token });
      await resetToken.save();
  
      const resetUrl = `https://tag-backend.vercel.app/api/auth/reset-password/${token}`;
  
      await transporter.sendMail({
        from: '"Tag Support" <your_email@gmail.com>',
        to: email,
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial; max-width:600px; margin:auto; padding:20px; border:1px solid #eee; border-radius:10px; background-color:#f8f4ff;">
            <h2 style="color:#6a0dad;">Reset Your Password</h2>
            <p>Hello ${user.name},</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" style="display:inline-block; background:#6a0dad; color:white; padding:10px 20px; border-radius:5px; text-decoration:none;">Reset Password</a>
            <p style="margin-top:20px; color:#555;">If you did not request this, please ignore this email.</p>
          </div>
        `
      });
  
      res.status(200).json({ message: 'Reset password email sent' });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

//   This Route to Your Backend (HTML Page for Password Reset)
  router.get('/reset-password/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const tokenDoc = await PasswordResetToken.findOne({ token });
  
      if (!tokenDoc) {
        return res.send(`
          <div style="text-align:center;padding:50px;font-family:sans-serif;">
            <h2 style="color:#b00020;">Invalid or expired token</h2>
            <p>This password reset link is no longer valid.</p>
          </div>
        `);
      }
  
      // Render HTML form
      res.send(`
        <html>
          <head>
            <title>Reset Password</title>
            <style>
              body {
                background-color: #f3e8ff;
                font-family: 'Segoe UI', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
              }
              .card {
                background: white;
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                width: 100%;
                max-width: 400px;
                text-align: center;
              }
              input[type="password"] {
                padding: 10px;
                width: 100%;
                margin: 10px 0;
                border: 1px solid #ccc;
                border-radius: 8px;
                font-size: 16px;
              }
              button {
                background-color: #6a0dad;
                color: white;
                border: none;
                padding: 12px 20px;
                font-size: 16px;
                border-radius: 8px;
                cursor: pointer;
                margin-top: 10px;
              }
              button:hover {
                background-color: #5a049d;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>Reset Your Password</h2>
              <form method="POST" action="/api/auth/reset-password/${token}">
                <input type="password" name="newPassword" placeholder="Enter new password" required />
                <button type="submit">Reset Password</button>
              </form>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      res.status(500).send('Something went wrong.');
    }
  });
  

  // POST /reset-password/:token


router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const tokenDoc = await PasswordResetToken.findOne({ token });
    if (!tokenDoc) {
      return res.send(`<h2 style="color:red; text-align:center;">Invalid or expired token</h2>`);
    }

    const user = await User.findById(tokenDoc.userId);
    if (!user) return res.send(`<h2 style="color:red; text-align:center;">User not found</h2>`);

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await tokenDoc.deleteOne();

    res.send(`
      <div style="text-align:center;padding:50px;font-family:sans-serif;">
        <h2 style="color:#4caf50;">Password reset successful!</h2>
        <p>You can now login with your new password.</p>
      </div>
    `);
  } catch (error) {
    res.status(500).send(`<h2 style="color:red;text-align:center;">Server Error</h2>`);
  }
});



  

module.exports = router;
