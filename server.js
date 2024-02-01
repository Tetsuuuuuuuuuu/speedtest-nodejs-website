const express = require('express');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const randomData = crypto.randomBytes(1024 * 1024); // This is a block of 1MiB random data

var privateKey = null;
var certificate = null;

app.use('/.well-known', express.static(path.join(__dirname, ".well-known")))
app.use('/public', express.static(path.join(__dirname, "public")))
app.set("view engine", "ejs")

// Parses command line arguments
let args = process.argv;
let host, httpPort, httpsPort, privateKeyPath, certificatePath;

args.forEach((arg, index) => {
    if (arg === '--server-ip' && index < args.length - 1) {
        host = args[index + 1];
    } else if (arg === '--server-httpPort' && index < args.length - 1) {
        httpPort = args[index + 1];
    } else if (arg === '--server-httpsPort' && index < args.length - 1) {
        httpsPort = args[index + 1];
    } else if (arg === '--server-privateKey' && index < args.length - 1) {
        privateKeyPath = args[index + 1];
    } else if (arg === '--server-certificate' && index < args.length - 1) {
        certificatePath = args[index + 1];
    }
});

// Sets default values for command line arguments
if (!host) {
    host = '0.0.0.0';
}
if (!httpPort) {
    httpPort = 80;
}
if (httpsPort) {
    privateKey = fs.readFileSync(privateKeyPath);
    certificate = fs.readFileSync(certificatePath);
}

// Render index page
app.get("/", (req, res) => {
    res.render("index.ejs")
});

// Implement Download and Upload routes

// Download route
app.get('/download', (req, res) => {
    const fileSize = 100 * 1024 * 1024; // 100MB in bytes
    const buffer = Buffer.alloc(1024 * 1024); // 1MB buffer size
    let remaining = fileSize;
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename=random.bin');
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Create a function to send the data in chunks
    const sendData = () => {
        if (remaining <= 0) {
            res.end();
            return;
        }

        const chunkSize = Math.min(remaining, buffer.length);
        res.write(buffer.slice(0, chunkSize));
        remaining -= chunkSize;

        // Schedule sending the next chunk
        setImmediate(sendData);
    };

    // Start sending data
    sendData();
});



// Upload route
app.post('/upload', (req, res) => {

});

// Creates a HTTP & a HTTPS web server with the specified options
http.createServer(app).listen(httpPort, host, () => {
    console.log('Hosting speedtest server on httpPort ' + httpPort + ', host ' + host);
});

if (privateKey && certificate) {
    https.createServer({ key: privateKey, cert: certificate }, app).listen(httpsPort, host, () => {
        console.log('Hosting speedtest server on httpsPort ' + httpsPort + ', host ' + host);
    });
}
