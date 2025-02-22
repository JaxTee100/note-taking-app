require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const { marked } = require('marked');
const path = require('path');
const { OpenAI } = require("openai");
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Preserve original filename
    }
});

const upload = multer({ storage });


// Upload Markdown file
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = path.join(__dirname, 'uploads', req.file.filename);
    const content = await fs.readFile(filePath, { encoding: 'utf-8' });

    // Convert Markdown to HTML
    const htmlContent = marked(content);

    res.status(200).json({ markdown: content, html: htmlContent });
    } catch (error) {
        res.status(500).json(
            { error: `Error uploading file ${error.message}` }
    );
    }
    
});

// Render saved Markdown notes
app.get('/note/:filename', async (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    console.log(__dirname)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    const content = await fs.readFile(filePath, 'utf-8');
    const htmlContent = marked(content);

    res.send(content);
});


app.post("/check-grammar", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const filePath = path.join(__dirname, "uploads", req.file.filename);
        const content = await fs.readFile(filePath, "utf-8");

        const response = await axios.post("https://api.languagetool.org/v2/check", null, {
            params: {
                text: content,
                language: "en-US",
            },
        });

        const matches = response.data.matches;
        let correctedText = content;

        // Apply corrections to text
        for (let i = matches.length - 1; i >= 0; i--) {
            const match = matches[i];
            if (match.replacements.length > 0) {
                correctedText =
                    correctedText.substring(0, match.offset) +
                    match.replacements[0].value +
                    correctedText.substring(match.offset + match.length);
            }
        }

        res.json({ correctedText });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: `Error checking grammar: ${error.message}` });
    }
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));