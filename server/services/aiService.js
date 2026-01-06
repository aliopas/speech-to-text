const OpenAI = require('openai');
const Groq = require('groq-sdk');
const fs = require('fs');
require('dotenv').config();

// Initialize OpenRouter (via OpenAI SDK)
const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
});

// Initialize Groq
// Note: .env has 'Groq-Api', sdk expects GROQ_API_KEY usually, so we pass it explicitly
const apiKey = process.env['Groq-Api'];
if (!apiKey) console.warn("Warning: Groq-Api key not found in .env");

const groq = new Groq({
    apiKey: apiKey
});

const aiService = {
    // 1. Generate Questions (Makharij al-Huruf focus)
    generateQuestions: async (surahText, difficulty = 'easy', count = 10) => {
        try {
            const prompt = `
            أنت معلم قرآن محترف. مهمتك إنشاء أسئلة "أكمل الفراغ" من النص القرآني التالي.
            
            المطلوب: توليد ${count} سؤال.
            
            لكل سؤال:
            1. اختر آية كاملة من النص.
            2. اختر كلمة مهمة من الآية لإخفائها (targetWord).
            3. أنشئ النص مع الفراغ (clozeText) بحيث تستبدل الكلمة المخفية بـ ".....".
            4. قدم 3 خيارات: الكلمة الصحيحة + كلمتين خاطئتين لكن منطقيتين.
            
            مهم جداً:
            - في clozeText، يجب أن تكون الكلمة المخفية مستبدلة بـ "....." فقط.
            - لا تضع الكلمة الصحيحة في clozeText أبداً.
            - احتفظ بالتشكيل الكامل في جميع النصوص.
            
            النص القرآني:
            ${typeof surahText === 'string' ? surahText.substring(0, 3000) : JSON.stringify(surahText).substring(0, 3000)}...

            أخرج النتيجة بصيغة JSON فقط بدون أي نص إضافي:
            [
                {
                    "questionId": 1,
                    "clozeText": "نص الآية مع ..... مكان الكلمة المخفية",
                    "targetWord": "الكلمة الصحيحة",
                    "options": ["الكلمة الصحيحة", "كلمة خاطئة 1", "كلمة خاطئة 2"]
                }
            ]
            
            مثال توضيحي:
            إذا كانت الآية: "إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ"
            والكلمة المخفية: "الْكَوْثَرَ"
            فيجب أن يكون clozeText: "إِنَّا أَعْطَيْنَاكَ ....."
            `;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
            });

            const content = completion.choices[0].message.content;
            const cleaner = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleaner);
        } catch (error) {
            console.error("AI Gen Error:", error);
            return [];
        }
    },

    // 2. Transcribe Audio (Groq Whisper)
    transcribeAudio: async (filePath, verseContext = "") => {
        try {
            // Build enhanced prompt with verse context to prevent hallucination
            let enhancedPrompt = "القرآن الكريم. نطق عربي فصيح.";

            if (verseContext) {
                // Strong priming: Provide the EXACT verse text as "context" or "prompt"
                // This biases Whisper to recognize words from this specific verse
                enhancedPrompt = `سياق الآية: "${verseContext}". المستخدم يقرأ كلمة من هذه الآية.`;
            }

            const transcription = await groq.audio.transcriptions.create({
                file: fs.createReadStream(filePath),
                model: "whisper-large-v3",
                response_format: "verbose_json",
                language: "ar",
                temperature: 0.0,
                prompt: enhancedPrompt
            });

            console.log('Whisper with context:', { context: verseContext, result: transcription.text });
            return transcription.text;
        } catch (error) {
            console.error("Transcribe Error:", error);
            throw error;
        }
    },

    // 3. Analyze Performance (Stats)
    analyzeStats: async (history) => {
        try {
            const prompt = `
            Analyze the following student performance history in Quran recitation:
            ${JSON.stringify(history)}
            
            Provide a concise summary of weaknesses (e.g. "Struggles with Throat letters (Throat)") and tips for improvement. Arabic language response.
            `;
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
            });
            return completion.choices[0].message.content;
        } catch (e) { return "لا توجد بيانات كافية."; }
    }
};

module.exports = aiService;
