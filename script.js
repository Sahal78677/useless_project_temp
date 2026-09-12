const physicalLayout = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['z','x','c','v','b','n','m']
];

const sentences = [
    "system breach detected initiating security protocols",
    "neural link established begin data extraction",
    "bypassing mainframe firewalls with randomized keystrokes",
    "cybernetic enhancements require absolute precision",
    "the algorithm shifting makes muscle memory useless",
    "unauthorized access trace route in progress",
    "decrypting quantum packet stream payload secured",
    "override sequence activated chaos engine running"
];

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let currentMapping = {};
let targetSentence = "";
let currentIndex = 0, totalKeystrokes = 0, correctKeystrokes = 0;
let gameActive = false;
let startTime, stopwatchInterval, shuffleInterval;
let shuffleSetting = 5.0, shuffleTimeLeft = 5.0;

// DOM
const screenClick = document.getElementById('click-to-start');
const screenIntro = document.getElementById('studio-intro');
const screenLoading = document.getElementById('loading-screen');
const appContainer = document.getElementById('main-app');
const screenStart = document.getElementById('start-screen');
const screenGame = document.getElementById('game-screen');
const screenResults = document.getElementById('results-screen');
const overlayChaos = document.getElementById('chaos-overlay');
const keyboardEl = document.getElementById('keyboard');
const sentenceEl = document.getElementById('target-sentence');
const stopwatchEl = document.getElementById('stopwatch');
const shuffleTimerEl = document.getElementById('shuffle-timer');
const spacebarEl = document.getElementById('key-space');
const themeToggleBtn = document.getElementById('theme-toggle');

// Theme Toggle
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
});

// Sound Engine
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode); gainNode.connect(audioCtx.destination);

    if (type === 'cinematic-hit') {
        osc.type = 'square'; osc.frequency.setValueAtTime(40, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 1);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
        osc.start(); osc.stop(audioCtx.currentTime + 1);
    } else if (type === 'correct') {
        osc.type = 'square'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'wrong') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'glitch') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(50, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'finish') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        osc.start(); osc.stop(audioCtx.currentTime + 0.6);
    }
}

// Cinematic Sequence
screenClick.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    screenClick.classList.add('hidden');
    screenIntro.classList.remove('hidden');

    const letters = document.querySelectorAll('.letter');
    letters.forEach((letter, index) => {
        setTimeout(() => {
            playSound('cinematic-hit');
            letter.classList.add('animate');
        }, index * 300);
    });

    setTimeout(() => {
        screenIntro.style.opacity = '0';
        setTimeout(() => {
            screenIntro.classList.add('hidden');
            startLoadingSequence();
        }, 500);
    }, 2500);
});

function startLoadingSequence() {
    screenLoading.classList.remove('hidden');
    screenLoading.style.opacity = '1';
    let progress = 0;
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('loading-text');
    
    const loadingInterval = setInterval(() => {
        progress += Math.floor(Math.random() * 20) + 10;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
            setTimeout(() => {
                screenLoading.style.opacity = '0';
                setTimeout(() => {
                    screenLoading.classList.add('hidden');
                    appContainer.classList.remove('hidden');
                    showScreen(screenStart);
                }, 500);
            }, 600);
        }
        bar.style.width = progress + '%';
        text.textContent = `Loading Assets... ${progress}%`;
    }, 150);
}

function showScreen(screenEl) {
    screenStart.classList.add('hidden');
    screenGame.classList.add('hidden');
    screenResults.classList.add('hidden');
    screenEl.classList.remove('hidden');
}

function renderKeyboard() {
    keyboardEl.innerHTML = '';
    physicalLayout.forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.className = 'key-row';
        row.forEach(physicalKey => {
            const keyEl = document.createElement('button');
            keyEl.className = 'key'; keyEl.id = `key-${physicalKey}`;
            keyEl.textContent = gameActive ? currentMapping[physicalKey] : physicalKey;
            rowEl.appendChild(keyEl);
        });
        keyboardEl.appendChild(rowEl);
    });
}

function renderSentence(isError = false) {
    let html = '';
    for (let i = 0; i < targetSentence.length; i++) {
        let char = targetSentence[i];
        if (i < currentIndex) html += `<span class="char typed">${char}</span>`;
        else if (i === currentIndex) html += `<span class="char current ${isError ? 'error' : ''}">${char}</span>`;
        else html += `<span class="char untyped">${char}</span>`;
    }
    sentenceEl.innerHTML = html;
}

function shuffleKeyboard() {
    const alphabet = "abcdefghijklmnopqrstuvwxyz".split('');
    for (let i = alphabet.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [alphabet[i], alphabet[j]] = [alphabet[j], alphabet[i]];
    }
    let alphaIndex = 0;
    physicalLayout.forEach(row => {
        row.forEach(physicalKey => { currentMapping[physicalKey] = alphabet[alphaIndex++]; });
    });

    renderKeyboard();
    shuffleTimeLeft = shuffleSetting;
    keyboardEl.style.opacity = '0.5';
    setTimeout(() => keyboardEl.style.opacity = '1', 100);
}

function handleInput(physicalKey) {
    if (!gameActive) return;
    let keyEl, mappedLetter;

    if (physicalKey === ' ') { keyEl = spacebarEl; mappedLetter = ' '; } 
    else {
        keyEl = document.getElementById(`key-${physicalKey}`);
        if (!keyEl) return;
        mappedLetter = currentMapping[physicalKey];
    }

    const targetChar = targetSentence[currentIndex];
    totalKeystrokes++;

    keyEl.classList.add('active');
    setTimeout(() => keyEl.classList.remove('active'), 80);

    if (mappedLetter === targetChar) {
        playSound('correct');
        correctKeystrokes++;
        keyEl.classList.add('correct');
        setTimeout(() => keyEl.classList.remove('correct'), 100);
        currentIndex++; renderSentence(false);
        if (currentIndex >= targetSentence.length) endGame();
    } else {
        playSound('wrong');
        keyEl.classList.add('wrong');
        renderSentence(true);
        setTimeout(() => keyEl.classList.remove('wrong'), 100);
    }
}

function triggerChaosTransition(callback) {
    playSound('glitch');
    overlayChaos.classList.remove('hidden');
    appContainer.style.transform = "scale(0.98)";
    
    setTimeout(() => {
        overlayChaos.classList.add('hidden');
        appContainer.style.transform = "scale(1)";
        callback();
    }, 600);
}

function startGame(timeSetting) {
    triggerChaosTransition(() => {
        shuffleSetting = timeSetting;
        gameActive = true;
        targetSentence = sentences[Math.floor(Math.random() * sentences.length)];
        currentIndex = 0; totalKeystrokes = 0; correctKeystrokes = 0;
        
        keyboardEl.classList.remove('disabled');
        spacebarEl.classList.remove('disabled');
        
        showScreen(screenGame);
        renderSentence(); shuffleKeyboard();
        
        startTime = Date.now();
        stopwatchInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            stopwatchEl.textContent = elapsed.toFixed(2) + 's';
        }, 50);

        shuffleInterval = setInterval(() => {
            shuffleTimeLeft -= 0.1;
            if (shuffleTimeLeft <= 0) shuffleKeyboard();
            else shuffleTimerEl.textContent = Math.max(0, shuffleTimeLeft).toFixed(1) + 's';
        }, 100);
    });
}

function endGame() {
    gameActive = false;
    clearInterval(stopwatchInterval); clearInterval(shuffleInterval);
    playSound('finish');
    
    const elapsedMins = ((Date.now() - startTime) / 1000) / 60;
    const wpm = Math.round((targetSentence.length / 5) / elapsedMins);
    const accuracy = totalKeystrokes > 0 ? Math.round((correctKeystrokes / totalKeystrokes) * 100) : 0;
    
    document.getElementById('result-wpm').textContent = wpm;
    document.getElementById('result-acc').textContent = accuracy + '%';
    document.getElementById('result-time').textContent = elapsedMins.toFixed(2);
    
    keyboardEl.classList.add('disabled'); spacebarEl.classList.add('disabled');
    setTimeout(() => showScreen(screenResults), 1000);
}

document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', (e) => startGame(parseFloat(e.target.getAttribute('data-time'))));
});

document.getElementById('restart-btn').addEventListener('click', () => {
    triggerChaosTransition(() => showScreen(screenStart));
});

document.addEventListener('keydown', (e) => {
    if (e.key === ' ') { if(gameActive) e.preventDefault(); handleInput(' '); } 
    else if (e.key.length === 1 && e.key.match(/[a-z]/i)) { handleInput(e.key.toLowerCase()); }
});

renderKeyboard();