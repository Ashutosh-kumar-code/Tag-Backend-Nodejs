const express = require('express');
const router = express.Router();
const Video = require('../models/Video'); // Adjust path as needed


// Like/Unlike a video
router.post('/videos/:id/like', async (req, res) => {
  const userId = req.body.userId;
  const videoId = req.params.id;

  try {
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    if (!userId) return res.status(404).json({ message: 'userId not found' });

    const liked = video.likes.includes(userId);

    if (liked) {
      // Unlike
      video.likes.pull(userId);
    } else {
      // Like
      video.likes.push(userId);
    }

    await video.save();
    res.status(200).json({
      message: liked ? 'Video unliked' : 'Video liked',
      likeCount: video.likes.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get like count for a video
router.get('/videos/:id/likes', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    res.status(200).json({ likeCount: video.likes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if a video is liked by a user
router.get('/videos/:id/isliked/:userId', async (req, res) => {
  const { id: videoId, userId } = req.params;

  try {
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    const liked = video.likes.includes(userId);

    res.status(200).json({ liked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Add comment to a video
router.post('/videos/:id/comments', async (req, res) => {
  const { userId, text } = req.body;

  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    video.comments.push({ userId, text });
    await video.save();

    res.status(200).json({ message: 'Comment added', commentCount: video.comments.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all comments of a video
router.get('/videos/:id/comments', async (req, res) => {
    try {
      const video = await Video.findById(req.params.id).populate({
        path: 'comments.userId',
        select: 'name image' // ✅ Only fetching these fields from User
      });
  
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
  
      // Transform comments to include user details explicitly
      const formattedComments = video.comments.map(comment => ({
        _id: comment._id,
        text: comment.text,
        createdAt: comment.createdAt,
        user: {
          _id: comment.userId._id,
          name: comment.userId.name,
          image: comment.userId.image
        }
      }));
  
      res.status(200).json({
        comments: formattedComments,
        commentCount: formattedComments.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

  
  // Get related videos with creator info
  router.get('/videos/:id/related', async (req, res) => {
    try {
      const videoId = req.params.id;
  
      // Get the current video
      const currentVideo = await Video.findById(videoId);
      if (!currentVideo) {
        return res.status(404).json({ message: 'Video not found' });
      }
  
      // Find related videos (same category, exclude current video)
      const relatedVideos = await Video.find({
        _id: { $ne: videoId },
        category: currentVideo.category
      })
      .populate({
        path: 'creatorId',
        select: 'name image'
      })
      .sort({ views: -1 })
      .limit(10);
  
      res.status(200).json({ relatedVideos });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  


module.exports = router;