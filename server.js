const express = require('express');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

const app = express();
const randomData = crypto.randomBytes(1024 * 1024); // 1MiB random data

// Serve static files
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Rate limiting
app.use(rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 50
}));

// Favicon route
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'public', 'favicon.ico')));

// View engine setup
app.set('view engine', 'ejs');

// Configure storage for uploaded files
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

// Create multer instance
const upload = multer({ storage });

// Parse command line arguments
const args = process.argv.slice(2);
let host = '0.0.0.0',
    httpPort = 80,
    httpsPort,
    privateKey,
    certificate;

args.forEach((arg, index) => {
    switch (arg) {
        case '--server-ip':
            host = args[index + 1] || host;
            break;
        case '--server-httpPort':
            httpPort = args[index + 1] || httpPort;
            break;
        case '--server-httpsPort':
            httpsPort = args[index + 1];
            break;
        case '--server-privateKey':
            privateKey = fs.readFileSync(args[index + 1]);
            break;
        case '--server-certificate':
            certificate = fs.readFileSync(args[index + 1]);
            break;
    }
});

// Rate limit middleware
function isRateLimited(req) {
    return req.rateLimit.remaining === 0;
}

app.use((req, res, next) => {
    if (isRateLimited(req)) {
        return res.status(429).send('Too many requests, please try again later.');
    }
    next();
});

// Render index page
app.get('/', (req, res) => {
    res.render('index.ejs');
});

// Download route
app.get('/download', (req, res) => {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename=download.bin');
    res.setHeader('Cache-Control', 'no-cache');

    const baseTime = new Date().getTime();

    const sendFile = () => {
        for (let i = 0; i < 100; i++) {
            const currentTime = new Date().getTime();
            if (currentTime - baseTime > 15000) {
                break;
            }
            res.write(randomData);
        }

        res.end();
    };

    res.on('error', (err) => {
        console.error(err);
        res.status(500).send('Internal Server Error');
    });

    sendFile();
});


// Upload route
app.post('/upload', upload.single('file'));

// Create HTTP server
http.createServer(app).listen(httpPort, host, () => {
    console.log(`Hosting speedtest server on httpPort ${httpPort}, host ${host}`);
});

// Create HTTPS server if privateKey and certificate are provided
if (privateKey && certificate) {
    https.createServer({ key: privateKey, cert: certificate }, app).listen(httpsPort, host, () => {
        console.log(`Hosting speedtest server on httpsPort ${httpsPort}, host ${host}`);
    });
}
