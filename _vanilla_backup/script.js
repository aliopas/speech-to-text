const state = {
    quranData: null,
    flatTests: [],
    currentAyahIndex: 0,
    isRecording: false,
    sttRecognition: null
};

const elements = {
    ayahText: document.getElementById('ayah-text'),
    surahName: document.getElementById('surah-name'),
    ayahCounter: document.getElementById('ayah-counter'),
    candidatesList: document.getElementById('candidates-list'),
    recordBtn: document.getElementById('record-btn'),
    recordingStatus: document.getElementById('recording-status'),
    feedbackArea: document.getElementById('feedback-area'),
    feedbackTitle: document.getElementById('feedback-title'),
    feedbackMessage: document.getElementById('feedback-message'),
    retryBtn: document.getElementById('retry-btn'),
    nextBtn: document.getElementById('next-btn')
};

document.addEventListener('DOMContentLoaded', async () => {
    initSpeechRecognition();
    await loadQuranData();
});

async function loadQuranData() {
    try {
        const response = await fetch('quran_data.json');
        if (!response.ok) throw new Error("Could not load data");
        state.quranData = await response.json();

        state.flatTests = flattenData(state.quranData);
        if (state.flatTests.length > 0) loadAyah(0);
        else showError("لا توجد بيانات");
    } catch (e) {
        console.error(e);
        showError("خطأ في تحميل البيانات");
    }
}

function flattenData(data) {
    const tests = [];
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item.ayahs) {
                item.ayahs.forEach(ayah => tests.push({ ...ayah, surahName: item.surahName }));
            } else if (item.test) {
                tests.push(item);
            }
        });
    }
    return tests;
}

function loadAyah(index) {
    if (index >= state.flatTests.length) {
        showCompletion();
        return;
    }

    state.currentAyahIndex = index;
    const currentData = state.flatTests[index];
    const test = currentData.test;

    elements.feedbackArea.classList.add('hidden');
    elements.recordBtn.classList.remove('hidden');
    elements.candidatesList.innerHTML = '';

    elements.surahName.textContent = currentData.surahName || "سورة";
    elements.ayahCounter.textContent = `الآية ${index + 1} / ${state.flatTests.length}`;

    const targetWord = test.targetWord;
    const maskedText = currentData.ayahText.includes(targetWord)
        ? currentData.ayahText.replace(targetWord, '<span class="missing-word">.......</span>')
        : currentData.ayahText;

    elements.ayahText.innerHTML = maskedText;

    test.candidates.forEach(word => {
        const span = document.createElement('span');
        span.className = 'candidate';
        span.textContent = word;
        elements.candidatesList.appendChild(span);
    });
}

function normalizeArabic(text) {
    if (!text) return "";
    let normalized = text.replace(/[\u064B-\u065F\u0670]/g, ""); // Tashkeel
    normalized = normalized.replace(/[أإآ]/g, "ا");
    normalized = normalized.replace(/ة/g, "ه");
    normalized = normalized.replace(/ى/g, "ي");
    return normalized.trim();
}

function checkPronunciation(transcribedText) {
    const currentTest = state.flatTests[state.currentAyahIndex].test;
    const correctWord = currentTest.targetWord;

    const normTranscribed = normalizeArabic(transcribedText);
    const normTarget = normalizeArabic(correctWord);

    console.log(normTranscribed, normTarget);

    if (normTranscribed.includes(normTarget)) handleSuccess();
    else handleFailure(correctWord);
}

function handleSuccess() {
    stopRecording();
    showFeedback("success", "أحسنت! ✔️", "إجابة صحيحة");
    elements.nextBtn.classList.remove('hidden');
    elements.retryBtn.classList.add('hidden');

    const correctWord = state.flatTests[state.currentAyahIndex].test.targetWord;
    elements.ayahText.innerHTML = state.flatTests[state.currentAyahIndex].ayahText.replace(
        correctWord, `<span class="missing-word" style="color: var(--success-color); border-bottom: none;">${correctWord}</span>`
    );
}

function handleFailure(correctWord) {
    stopRecording();
    showFeedback("error", "محاولة خاطئة ❌", `الصحيح: ${correctWord}`);
    elements.retryBtn.classList.remove('hidden');
    elements.nextBtn.classList.add('hidden');
}

function showFeedback(type, title, message) {
    elements.feedbackArea.className = `feedback-box ${type}`;
    elements.feedbackTitle.textContent = title;
    elements.feedbackMessage.textContent = message;
    elements.feedbackArea.classList.remove('hidden');
    elements.recordBtn.classList.add('hidden');
}

function showError(msg) { elements.ayahText.textContent = msg; }
function showCompletion() { elements.ayahText.textContent = "تم الانتهاء!"; }

function initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    state.sttRecognition = new SpeechRecognition();
    state.sttRecognition.lang = 'ar-SA';
    state.sttRecognition.continuous = false;
    state.sttRecognition.interimResults = false;

    state.sttRecognition.onstart = () => updateRecordingUI(true);
    state.sttRecognition.onend = () => updateRecordingUI(false);
    state.sttRecognition.onresult = (event) => checkPronunciation(event.results[0][0].transcript);
    state.sttRecognition.onerror = () => updateRecordingUI(false);
}

function toggleRecording() {
    if (!state.sttRecognition) return alert("المتصفح لا يدعم STT");
    state.isRecording ? state.sttRecognition.stop() : state.sttRecognition.start();
}

function stopRecording() { if (state.isRecording) state.sttRecognition.stop(); }

function updateRecordingUI(isRecording) {
    state.isRecording = isRecording;
    if (isRecording) {
        elements.recordBtn.classList.add('hidden');
        elements.recordingStatus.classList.remove('hidden');
    } else {
        elements.recordBtn.classList.remove('hidden');
        elements.recordingStatus.classList.add('hidden');
    }
}

if (elements.recordBtn) elements.recordBtn.addEventListener('click', toggleRecording);
if (elements.retryBtn) elements.retryBtn.addEventListener('click', () => loadAyah(state.currentAyahIndex));
if (elements.nextBtn) elements.nextBtn.addEventListener('click', () => loadAyah(state.currentAyahIndex + 1));
