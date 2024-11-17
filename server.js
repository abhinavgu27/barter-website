const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs'); // Add this import

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); 

// MongoDB connection
mongoose.connect('mongodb+srv://abhinavsinghal29oct:123456ishu@cluster0.4vahf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Create uploads directory if it doesn't exist
const uploadDir = 'public/uploads';
if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
}
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Error: Images only!');
        }
    }
});

// Create Listing Schema
const listingSchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: true
    },
    itemDescription: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Listing = mongoose.model('Listing', listingSchema);

// Routes
app.post('/api/listings', upload.single('itemImage'), async (req, res) => {
    try {
        const imageUrl = `/uploads/${req.file.filename}`;
        
        const listing = new Listing({
            itemName: req.body.itemName,
            itemDescription: req.body.itemDescription,
            imageUrl: imageUrl
        });

        await listing.save();
        res.status(201).json({ 
            message: 'Listing created successfully',
            listing 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error creating listing',
            error: error.message 
        });
    }
});

// Get all listings
app.get('/api/listings', async (req, res) => {
    try {
        const listings = await Listing.find().sort({ createdAt: -1 });
        res.json(listings);
    } catch (error) {
        res.status(500).json({ 
            message: 'Error fetching listings',
            error: error.message 
        });
    }
});

// Delete listing
app.delete('/api/listings/:id', async (req, res) => {
    try {
        // First find the listing to get the image URL
        const listing = await Listing.findById(req.params.id);
        
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        // Delete the image file
        if (listing.imageUrl) {
            const imagePath = path.join(__dirname, 'public', listing.imageUrl);
            console.log('Attempting to delete image at:', imagePath);
            
            try {
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath); // Using synchronous version for simplicity
                    console.log('Image file deleted successfully');
                } else {
                    console.log('Image file not found');
                }
            } catch (err) {
                console.error('Error deleting image file:', err);
            }
        }

        // Delete the listing from database
        await Listing.findByIdAndDelete(req.params.id);
        
        res.json({ 
            message: 'Listing and associated image deleted successfully'
        });
    } catch (error) {
        console.error('Error in delete route:', error);
        res.status(500).json({ 
            message: 'Error deleting listing',
            error: error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});