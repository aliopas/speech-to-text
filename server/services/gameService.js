// In-memory session store (Map)
// Key: sessionId, Value: { surah, questions: [], currentIndex: 0, score: 0, history: [], totalAnswered: 0 }
const sessions = new Map();
const quranData = require('../quran_data.json');
const aiService = require('./aiService');
const ttsService = require('./ttsService');

const BATCH_SIZE = 10;
const PREFETCH_THRESHOLD = 7; // When user reaches question 7, fetch next batch

// Helper: Calculate similarity between two strings using Levenshtein distance
function calculateSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return 1 - (distance / maxLen);
}

const gameService = {
    // Generate batch of questions from random surah
    generateBatch: async () => {
        if (!Array.isArray(quranData) || quranData.length === 0) {
            throw new Error("Invalid Quran Data Structure");
        }

        const selectedSurah = quranData[Math.floor(Math.random() * quranData.length)];
        let contextText = "";
        if (selectedSurah.text && typeof selectedSurah.text === 'object') {
            contextText = Object.values(selectedSurah.text).join(" ");
        }

        let questions = [];
        if (contextText) {
            const chunk = contextText.substring(0, 4000);
            const rawQuestions = await aiService.generateQuestions(chunk, 'easy', BATCH_SIZE);

            // Embed Surah Name into each question
            questions = rawQuestions.map(q => ({
                ...q,
                surahName: selectedSurah.name || "سورة غير معروفة"
            }));
        }

        return { surahName: selectedSurah.name || "Unknown", questions: questions || [] };
    },

    startSession: async () => {
        const sessionId = Date.now().toString();

        // Generate first batch of 10 questions
        const batch = await gameService.generateBatch();

        sessions.set(sessionId, {
            sessionId,
            surahName: batch.surahName,
            questions: batch.questions,
            currentIndex: 0,
            batchIndex: 0,          // Which question in current batch (0-9)
            totalAnswered: 0,       // Total questions answered correctly
            history: [],
            isFetchingMore: false,  // Flag to prevent duplicate fetches
            showSummary: false
        });

        return sessions.get(sessionId);
    },

    getSession: (id) => sessions.get(id),

    // Pre-fetch next batch of questions (called when user reaches question 7)
    prefetchQuestions: async (sessionId) => {
        const session = sessions.get(sessionId);
        if (!session || session.isFetchingMore) return;

        session.isFetchingMore = true;
        console.log('Prefetching next batch of questions...');

        try {
            const batch = await gameService.generateBatch();
            // Append new questions to existing array
            session.questions.push(...batch.questions);
            console.log(`Added ${batch.questions.length} more questions. Total: ${session.questions.length}`);
        } catch (err) {
            console.error('Prefetch error:', err);
        } finally {
            session.isFetchingMore = false;
        }
    },

    checkAnswer: async (sessionId, transcribedText) => {
        const session = sessions.get(sessionId);
        if (!session) throw new Error("Session not found");

        const currentQ = session.questions[session.currentIndex];
        if (!currentQ) {
            return { error: "No question available", completed: true };
        }

        // Better Arabic normalization - Smart handling of Quranic Orthography vs Standard Dictation
        const normalize = (text) => {
            if (!text) return '';

            // 1. Convert Superscript Aleph (Small Aleph) to Normal Aleph
            // This fixes: 'سَمَٰوَٰت' -> 'سماوات' (Matches Whisper output)
            let normalized = text.replace(/\u0670/g, 'ا');

            // 2. Standardize Alephs and Hamzas
            normalized = normalized
                .replace(/[أإآ]/g, 'ا')
                .replace(/ى/g, 'ي')
                .replace(/ة/g, 'ه')
                .replace(/ؤ/g, 'و')
                .replace(/ئ/g, 'ي');

            // 3. Remove remaining diacritics (Fatha, Damma, Kasra, etc.) but NOT the letters we just fixed
            normalized = normalized.replace(/[\u064B-\u065F]/g, '')
                .replace(/\u0640/g, '') // Remove Tatweel
                .replace(/[^\u0621-\u064Aء]/g, '') // Keep only Arabic letters
                .trim();

            // 4. Handle Standard Spelling Exceptions (Imla'i)
            // Whisper usually outputs "الرحمن" not "الرحمان", "هذا" not "هاذا"
            // We revert specific known words to their defective writing to match standard STT output
            const exceptions = {
                'الرحمان': 'الرحمن',
                'هاذا': 'هذا',
                'هاذه': 'هذه',
                'ذالك': 'ذلك',
                'ولايك': 'اوليك',
                'ايلف': 'ايلاف',
                'لكن': 'لكن', // usually written same, but good to ensure
                'اللهم': 'اللهم'
            };

            // Apply exceptions replacement
            Object.keys(exceptions).forEach(key => {
                // Regex to replace full word matches
                const regex = new RegExp(`^${key}$`, 'g'); // Strict full word check or logic handled by comparison
                if (normalized === key) normalized = exceptions[key];
                // Check if it's part of utterance? For checkAnswer logic we compare Normalized Strings.
                // It's safer to just handle common substring patterns if needed, but strict whole-word is safer for specific grammar tokens.
                // For now, let's just handle specific frequent tokens if the user said them "long".
            });

            // Actually, for checking "Containment", it is better to handle specific replacements globally
            normalized = normalized
                .replace(/الرحمان/g, 'الرحمن')
                .replace(/هاذا/g, 'هذا')
                .replace(/هاذه/g, 'هذه')
                .replace(/ذالك/g, 'ذلك');

            return normalized;
        };

        const target = currentQ.targetWord || currentQ.correctAnswer || currentQ.ayahFragment || "";
        if (!target) {
            return { error: "Invalid question format" };
        }

        const normTranscribed = normalize(transcribedText);
        const normTarget = normalize(target);

        console.log('Comparing:', {
            userSaid: transcribedText,
            normalized: normTranscribed,
            target: target,
            normalizedTarget: normTarget
        });

        // STRICT comparison - only accept if user said the target word correctly
        let isCorrect = false;

        if (normTranscribed === normTarget) {
            // Exact match
            isCorrect = true;
        } else if (normTranscribed.includes(normTarget)) {
            // User said extra words but included the target
            isCorrect = true;
        } else if (normTarget.includes(normTranscribed) && normTranscribed.length >= 2) { // Changed 3 to 2
            // PARTIAL MATCH: relaxed specifically for short words like "ربه" -> "رب"
            // If the transcribed part is at least 65% of the target length, accept it.
            const ratio = normTranscribed.length / normTarget.length;
            if (ratio >= 0.65) {
                isCorrect = true;
                console.log(`Partial match accepted: ${normTranscribed} in ${normTarget} (${ratio.toFixed(2)})`);
            }
        } else if (normTranscribed.length >= 3 && normTarget.length >= 3) {
            // Levenshtein fallback
            const similarity = calculateSimilarity(normTranscribed, normTarget);

            // For longer words, keep 0.8
            // For short words (length 3-4), allow slightly lower threshold to account for one-letter mistakes
            // length 3: 1 error = 0.66 sim. length 4: 1 error = 0.75 sim.
            const threshold = normTarget.length <= 4 ? 0.65 : 0.8;

            isCorrect = similarity >= threshold;
            if (isCorrect && threshold < 0.8) {
                console.log(`Short word relaxed match: ${normTranscribed} vs ${normTarget} (${similarity.toFixed(2)})`);
            }
        }

        console.log('Match result:', {
            isCorrect,
            userLength: normTranscribed.length,
            targetLength: normTarget.length
        });

        // Generate audio feedback
        let feedbackAudio = null;
        try {
            // Updated ttsService now accepts (wrongText, correctText, isCorrect)
            feedbackAudio = await ttsService.generateCorrection(transcribedText || "غير واضح", target, isCorrect);
        } catch (err) {
            console.error("TTS generation failed:", err);
        }

        // Record in history
        session.history.push({
            questionId: currentQ.questionId,
            userAnswer: transcribedText,
            correctAnswer: target,
            clozeText: currentQ.clozeText,
            isCorrect
        });

        // Move to next question ONLY if correct
        if (isCorrect) {
            session.currentIndex++;
            session.batchIndex++;
            session.totalAnswered++;

            // Check if we should prefetch more questions (at question 7 of each batch)
            if (session.batchIndex === PREFETCH_THRESHOLD && !session.isFetchingMore) {
                // Fire and forget - don't await
                gameService.prefetchQuestions(sessionId);
            }

            // Check if completed a batch of 10
            if (session.batchIndex >= BATCH_SIZE) {
                session.batchIndex = 0; // Reset batch counter
                session.showSummary = true;
            }
        }

        const result = {
            isCorrect,
            userText: transcribedText,
            target: target,
            clozeText: currentQ.clozeText,
            options: currentQ.options,
            feedbackAudio: feedbackAudio ? feedbackAudio.toString('base64') : null,
            currentIndex: session.currentIndex,
            totalAnswered: session.totalAnswered,
            batchIndex: session.batchIndex,
            showSummary: session.showSummary
        };

        // Reset summary flag after sending
        if (session.showSummary) {
            session.showSummary = false;
        }

        return result;
    },

    // Get summary of last 10 questions
    getBatchSummary: async (sessionId) => {
        const session = sessions.get(sessionId);
        if (!session) return null;

        // Get last 10 entries from history
        const lastBatch = session.history.slice(-BATCH_SIZE);
        const wrongAnswers = lastBatch.filter(h => !h.isCorrect);
        const correctCount = lastBatch.filter(h => h.isCorrect).length;

        // Generate AI analysis if there are mistakes
        let analysis = "";
        if (wrongAnswers.length > 0) {
            try {
                analysis = await aiService.analyzeStats(wrongAnswers);
            } catch (e) {
                analysis = "تحتاج لمراجعة بعض الكلمات. حاول التركيز أكثر على النطق الصحيح.";
            }
        } else {
            analysis = "ممتاز! أداء رائع بدون أخطاء في هذه الجولة! 🎉";
        }

        return {
            totalQuestions: BATCH_SIZE,
            correctCount,
            wrongCount: wrongAnswers.length,
            wrongAnswers: wrongAnswers.map(w => ({
                question: w.clozeText,
                correct: w.correctAnswer,
                userSaid: w.userAnswer
            })),
            analysis,
            overallScore: session.totalAnswered
        };
    },

    analyzeAndStats: async (sessionId) => {
        const session = sessions.get(sessionId);
        if (!session) return null;
        return await aiService.analyzeStats(session.history);
    }
};

module.exports = gameService;
