const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const requirementRoutes = require('./routes/requirementRoutes');
const adminRoutes = require('./routes/adminRoutes');
const followRoutes = require('./routes/followRoutes');
const videoRoutes = require('./routes/videoRoutes');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(cors({ origin: "*" }));

mongoose.connect(process.env.MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

app.get("/", (req,res)=>{
    res.send("Hello, this is the Tag App Backend!");
})

app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/friend', followRoutes);
app.use('/api/videos', videoRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
