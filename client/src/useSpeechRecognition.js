
import React, { useState, useEffect, useRef } from 'react';
import { normalizeArabic } from './utils';

const useSpeechRecognition = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setError('المتصفح لا يدعم Web Speech API');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        // Switch to ar-EG (Egypt) as it might tolerate the user's accent better
        recognition.lang = 'ar-EG';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);
        recognition.onerror = (event) => {
            // Ignore no-speech error which happens often
            if (event.error !== 'no-speech') {
                console.warn("Speech Error:", event.error);
            }
            setIsRecording(false);
            if (event.error === 'not-allowed') {
                setError('يرجى السماح بالوصول للميكروفون');
            }
        };
        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognition) recognition.abort();
        };
    }, []);

    const startRecording = () => {
        setError(null);
        setTranscript('');
        if (recognitionRef.current) {
            try {
                // Ensure fresh start
                recognitionRef.current.abort();
                setTimeout(() => {
                    try { recognitionRef.current.start(); } catch (e) { console.error(e); }
                }, 100);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    return { isRecording, transcript, error, startRecording, stopRecording };
};

export default useSpeechRecognition;
