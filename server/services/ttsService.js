const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const ttsService = {
    // Generate correction audio with full diacritics
    generateCorrection: async (wrongText, correctText, isCorrect = false) => {
        try {
            // Choose message based on correctness
            let textToSpeak;
            if (isCorrect) {
                textToSpeak = `أحسنت! ${correctText}`;
            } else {
                textToSpeak = `الإجابة الصحيحة هي: ${correctText}`;
            }

            const voiceId = "pNInz6obpgDQGcFmaJgB"; // Adam (Male, Deep, Narration)
            const modelId = "eleven_multilingual_v2";
            const apiKey = process.env.ELEVENLABS_API_KEY;

            if (!apiKey) throw new Error("ElevenLabs API Key missing");

            const response = await axios({
                method: 'post',
                url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
                data: {
                    text: textToSpeak,
                    model_id: modelId,
                    voice_settings: {
                        stability: 0.75,
                        similarity_boost: 0.85,
                        style: 0.5,
                        use_speaker_boost: true
                    },
                    output_format: "mp3_44100_128",
                    pronunciation_dictionary_locators: []
                },
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            });

            return response.data;
        } catch (error) {
            console.error("TTS Error:", error?.response?.data || error.message);
            return null;
        }
    }
};

module.exports = ttsService;
