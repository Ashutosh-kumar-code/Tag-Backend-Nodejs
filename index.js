require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./config/cloudinary"); // Uses your existing config

// Route imports
const authRoutes = require('./routes/authRoutes');
const requirementRoutes = require('./routes/requirementRoutes');
const adminRoutes = require('./routes/adminRoutes');
const followRoutes = require('./routes/followRoutes');
const videoRoutes = require('./routes/videoRoutes');
const User = require("./models/User"); // adjust path as needed

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));

// Multer Cloudinary setup
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "chat_uploads",
        resource_type: "auto",
    },
});
const upload = multer({ storage });

// MongoDB Schema for Chat
const MessageSchema = new mongoose.Schema({
    senderId: String,
    receiverId: String,
    text: String,
    type: String, // "text", "image", "audio"
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", MessageSchema);

// Basic Test Route
app.get("/", (req, res) => {
    res.send("Hello, this is the Tag App Backend!");
});

// Your existing API routes
app.use('/api/auth', authRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/friend', followRoutes);
app.use('/api/videos', videoRoutes);

// Upload API for image/audio
app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: req.file.path });
});

// Get chat history
app.get("/chat/:userId/:selectedUserId", async (req, res) => {
    const { userId, selectedUserId } = req.params;
    try {
        const messages = await Message.find({
            $or: [
                { senderId: userId, receiverId: selectedUserId },
                { senderId: selectedUserId, receiverId: userId },
            ],
        }).sort({ timestamp: 1 });

        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/chatlist/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const messages = await Message.find({
            $or: [
                { senderId: userId },
                { receiverId: userId }
            ]
        });

        const chatUserIds = new Set();

        messages.forEach(msg => {
            if (msg.senderId !== userId) chatUserIds.add(msg.senderId);
            if (msg.receiverId !== userId) chatUserIds.add(msg.receiverId);
        });

        const users = await User.find({ _id: { $in: [...chatUserIds] } }).select("name email profileImage");

        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// Real-time chat using Socket.io
io.on("connection", (socket) => {
    console.log("User connected");

    socket.on("registerUser", (userId) => {
        socket.join(userId);
    });

    socket.on("sendMessage", async (data) => {
        const newMessage = new Message(data);
        await newMessage.save();
        io.to(data.receiverId).emit("receiveMessage", data);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
