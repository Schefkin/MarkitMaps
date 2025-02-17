var express = require('express');
const { body, validationResult } = require('express-validator');
var db = require('../db.js');

var router = express.Router();


const multer = require('multer');
const cloudinary = require('cloudinary').v2;


// Cloudinary configuration
cloudinary.config({
    cloud_name: 'dd9trxmnc',
    api_key: '894869558736479',
    api_secret: 'xR8X-IFFpnFLyHh6xfMlFkj5QLA'
});

// Multer setup for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },  // 10MB limit
}).single('image');



// file check stuff
const validColors = ['#3498db', '#2ecc71', '#f39c12', '#f1c40f', '#7f5539', '#95a5a6'];
const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png'];




// form validation
const formValidaton = [
    // validate text field
    body('text')
        .exists()
        .isString()
        .isLength({ min: 1, max: 150 }).withMessage('Text field must not be empty nor over 150 characters long')
        .trim() // Sanitize by trimming whitespace
        .escape(),  // Sanitize by escaping HTML characters

    // validate lnglat field
    body('lnglat')
        .exists(),

    // color
    body('color')
        .exists()
        .isIn(['#3498db', '#2ecc71', '#f39c12', '#f1c40f', '#7f5539', '#95a5a6'])
];




/* GET home page or map page based on login status */
router.get('/', function (req, res, next) {
    // Check if the user is logged in
    if (!req.user) {
        return res.render('home'); // Render 'home' if no user
    }

    // If the user is logged in, fetch the markers from the database
    db.all('SELECT * FROM data', [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.render('map'); // Render 'map' even if there's an error in fetching data
        } else {
            // console.log(rows);
            res.locals.filter = null; // Add any other necessary locals or filters
            return res.render('map', { user: req.user, markers: rows }); // Render 'map' with user info and markers
        }
    });
});


// submitting form on map handling
router.post('/map', upload, formValidaton, (req, res, next) => {
    // error validation

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // show error page
        return res.render('error', { errors: errors.array() }); // Make sure this is a valid error handling page
    }

    const { text, lnglat, color } = req.body;
    const file = req.file;
    let imageUrl = null;

    // checks before data can be uploaded to database
    if (!text || typeof text !== 'string') {
        return res.redirect('/');
    }

    if (!validColors.includes(color)) {
        return res.redirect('/');
    }

    if (file && file.mimetype) {
        if (!allowedFormats.includes(file.mimetype)) {
            return res.redirect('/');
        }
    }

    // lnglat checks 
    try {
        const tempLocation = JSON.parse(lnglat);
        if (!tempLocation || typeof tempLocation.lat !== 'number' || typeof tempLocation.lng !== 'number') {
            return res.redirect('/');
        }

        if (tempLocation.lat < -90 || tempLocation.lat > 90 || tempLocation.lng < -180 || tempLocation.lng > 180) {
            return res.redirect('/');
        }

    } catch (error) {
        return res.redirect('/');
    }

    // Proceed with file upload if file exists
    if (file) {
        cloudinary.uploader.upload_stream(
            {
                folder: 'MarkitMaps',
                transformation: [
                    { quality: 'auto', fetch_format: 'auto' },
                    { width: 150, height: 150, crop: 'fill', gravity: 'auto' }
                ]
            },
            (error, result) => {
                if (error) {
                    // console.error(error);
                    return res.redirect('/');
                }

                imageUrl = result.secure_url; // Get Cloudinary URL
                insertValuesIntoDatabase(imageUrl); // Continue with DB insert
            }
        ).end(file.buffer); // Upload the file buffer to Cloudinary
    } else {
        insertValuesIntoDatabase(imageUrl); // No file, insert with null imageUrl
    }

    // function that does the inserting, defined to avoid duplication
    function insertValuesIntoDatabase(imageUrl) {
        let today = new Date();
        let dateString = today.toISOString().split('T')[0];  // This gives YYYY-MM-DD
        const stmt = db.prepare("INSERT INTO data (lnglat, text, color, url, date) VALUES (?, ?, ?, ?, ?)");
        stmt.run(lnglat, text, color, imageUrl, dateString, function (err) {
            if (err) {
                // console.error(err);
                return res.redirect('/'); // Redirect in case of database error
            }
            return res.redirect('/'); // Successful insert, redirect to homepage
        });
    }
});



router.get('/info', function (req, res, next) {
    res.render('info');
});

router.get('/contact', function (req, res, next) {
    res.render('contact');
});

router.get('/error', function (req, res, next) {
    res.render('error');
});

// useless stuff
router.get('/privacypolicy', function (req, res, next) {
    res.render('pp');
});

router.get('/thermsofservice', function (req, res, next) {
    res.render('tos');
});

// // error handler middleware
router.use((err, req, res, next) => {
    // Log the error for debugging
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            // Handle the "Unexpected field" error specifically
            res.redirect('/error');
            next();
        }
    }
    res.redirect('/error');
    
});



module.exports = router;