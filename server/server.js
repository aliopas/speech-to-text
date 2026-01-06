const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const aiService = require('./services/aiService');
const gameService = require('./services/gameService');
const ttsService = require('./services/ttsService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Upload config for audio blobs
const upload = multer({ storage: multer.memoryStorage() });

// --- GAME ROUTES ---

// 1. Start Game
app.post('/api/game/start', async (req, res) => {
    try {
        const session = await gameService.startSession();
        res.json(session);
    } catch (e) {
        console.error("Start Game Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// 2. Submit Audio Answer
app.post('/api/game/answer', upload.single('audio'), async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!req.file || !sessionId) return res.status(400).json({ error: "Missing audio or sessionId" });

        // Save temp file preserving extension (Groq needs correct format hint)
        const originalName = req.file.originalname || 'audio.webm';
        let ext = path.extname(originalName) || '.webm';
        // Ensure ext has dot and is valid
        if (!ext.startsWith('.')) ext = '.' + ext;

        const tempPath = path.join(__dirname, 'temp_' + String(Date.now()) + Math.random() + ext);
        fs.writeFileSync(tempPath, req.file.buffer);

        // Get current question context to help Whisper
        const session = gameService.getSession(sessionId);
        const currentQuestion = session?.questions[session.currentIndex];

        // Construct the FULL expected verse to prime Whisper
        // This tells Whisper: "This is the text the user is trying to say"
        let fullVerseHint = "";
        if (currentQuestion) {
            const target = currentQuestion.targetWord || "";
            const cloze = currentQuestion.clozeText || "";
            // Replace '.....' or similar with the actual target word
            fullVerseHint = cloze.replace(/\.\.\.+/g, target);
        }

        // A. Transcribe with context
        let text = "";
        try {
            text = await aiService.transcribeAudio(tempPath, fullVerseHint);
        } catch (err) {
            console.error("STT Error", err);
            text = "";
        } finally {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }

        console.log("Transcribed:", text);

        // B. Check Logic (TTS is generated inside gameService now)
        const result = await gameService.checkAnswer(sessionId, text);

        res.json(result);

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// 3. Get batch summary (after every 10 questions)
app.get('/api/game/summary/:sessionId', async (req, res) => {
    try {
        const summary = await gameService.getBatchSummary(req.params.sessionId);
        res.json(summary);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// 3. Stats
app.get('/api/game/stats/:sessionId', async (req, res) => {
    try {
        const stats = await gameService.analyzeAndStats(req.params.sessionId);
        res.json({ stats });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. Get Full Session (Sync) - New Route for Prefetching update
app.get('/api/game/session/:sessionId', (req, res) => {
    try {
        const session = gameService.getSession(req.params.sessionId);
        if (!session) return res.status(404).json({ error: "Session not found" });
        res.json(session);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// Load Data (Legacy Route)
const dataPath = path.join(__dirname, 'quran_data.json');
app.get('/api/quran', (req, res) => {
    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to load data" });
        }
        res.json(JSON.parse(data));
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
