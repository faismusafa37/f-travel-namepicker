document.addEventListener('DOMContentLoaded', () => {
    const shuffleBtn = document.getElementById('shuffleBtn');
    const nameListInput = document.getElementById('nameList');
    const pickCountInput = document.getElementById('pickCount');
    const shuffleDisplay = document.getElementById('shuffleDisplay');
    const diceContainer = document.getElementById('diceContainer');
    const dice = diceContainer ? diceContainer.querySelector('.dice') : null;
    const initialScreen = document.getElementById('initialScreen');
    const resultOverlay = document.getElementById('resultOverlay');
    const finalWinners = document.getElementById('finalWinners');
    const resetBtn = document.getElementById('resetBtn');
    const settingsCard = document.getElementById('settingsCard');
    const toggleSettings = document.getElementById('toggleSettings');
    const fullscreenToggles = document.querySelectorAll('.fullscreen-toggle');
    const navbar = document.querySelector('.navbar');
    const reshuffleBtn = document.getElementById('reshuffleBtn');
    const fullscreenShuffleBtn = document.getElementById('fullscreenShuffleBtn');

    // --- Sound System ---
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;

    const playShuffleSound = () => {
        if (!audioCtx) audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const bufferSize = 2 * audioCtx.sampleRate;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 0;

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        whiteNoise.start();

        // Modulate gain for "shaking" effect
        let startTime = audioCtx.currentTime;
        const interval = 0.1;
        for (let i = 0; i < 30; i++) {
            gainNode.gain.setValueAtTime(Math.random() * 0.15 + 0.05, startTime + i * interval);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + (i + 1) * interval - 0.02);
        }

        return {
            stop: () => {
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
                setTimeout(() => whiteNoise.stop(), 200);
            }
        };
    };
    // ----------------------

    let isShuffling = false;
    let poolNames = []; // Persistent pool across redraws/shuffles

    // Fullscreen Toggles
    fullscreenToggles.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            } else {
                document.exitFullscreen();
            }
        });
    });

    // Handle Fullscreen Exit (via ESC key or browser button)
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            document.body.classList.add('fullscreen-active');
        } else {
            document.body.classList.remove('fullscreen-active');
            // One-step simplify: exit fullscreen and open settings automatically
            if (settingsCard) {
                settingsCard.classList.remove('collapsed');
            }
        }
    });

    const initiateShuffle = () => {
        if (isShuffling) return;

        const names = nameListInput.value
            .split(/[\n,]+/)
            .map(n => n.trim())
            .filter(n => n.length > 0);

        const pickCount = parseInt(pickCountInput.value);

        if (names.length === 0) {
            alert('Selection pool is empty!');
            return;
        }

        if (isNaN(pickCount) || pickCount < 1) {
            alert('Please specify a valid winner count.');
            return;
        }

        if (pickCount > names.length) {
            alert(`Insufficient pool: Only ${names.length} entries available.`);
            return;
        }

        if (settingsCard) settingsCard.classList.add('collapsed');

        // Initialize or update pool from textarea
        poolNames = names;

        setTimeout(() => startDiceShake(poolNames, pickCount), 400);
    };

    fullscreenShuffleBtn?.addEventListener('click', () => {
        initiateShuffle();
    });

    reshuffleBtn.addEventListener('click', () => {
        const pickCount = parseInt(pickCountInput.value);
        if (poolNames.length < pickCount) {
            alert(`Not enough names left in the pool to pick ${pickCount} more winners!`);
            return;
        }

        resultOverlay.classList.add('hidden');
        startDiceShake(poolNames, pickCount);
    });

    toggleSettings?.addEventListener('click', () => {
        settingsCard.classList.toggle('collapsed');
    });

    shuffleBtn?.addEventListener('click', () => {
        initiateShuffle();
    });

    resetBtn?.addEventListener('click', () => {
        resultOverlay?.classList.add('hidden');
        diceContainer?.classList.add('hidden');
        initialScreen?.classList.remove('hidden');
        fullscreenShuffleBtn?.classList.remove('hidden');
        if (shuffleBtn) shuffleBtn.disabled = false;
    });

    function startDiceShake(names, pickCount) {
        isShuffling = true;
        if (shuffleBtn) shuffleBtn.disabled = true;

        // Step 1: Hide Branding
        initialScreen.classList.add('hidden');
        resultOverlay.classList.add('hidden');
        fullscreenShuffleBtn.classList.add('hidden');

        const shuffleSound = playShuffleSound();

        // Step 2: Show Dice & Start Shake
        setTimeout(() => {
            diceContainer.classList.remove('hidden');
            dice.classList.add('shaking');

            const faces = dice.querySelectorAll('.face');
            let elapsed = 0;
            let shakeDuration = 3000;
            let flickerInterval = 100;

            const flickerTimer = setInterval(() => {
                faces.forEach(face => {
                    const randomName = names[Math.floor(Math.random() * names.length)];
                    face.innerText = randomName;
                });
                elapsed += flickerInterval;
            }, flickerInterval);

            setTimeout(() => {
                clearInterval(flickerTimer);
                dice.classList.remove('shaking');
                isShuffling = false;

                if (shuffleSound) shuffleSound.stop();

                // Select winners and eliminate from pool
                const winners = [];
                for (let i = 0; i < pickCount; i++) {
                    if (poolNames.length === 0) break;
                    const idx = Math.floor(Math.random() * poolNames.length);
                    winners.push(poolNames.splice(idx, 1)[0]);
                }

                // Update textarea to reflect eliminated names
                nameListInput.value = poolNames.join('\n');

                // Show result after a short dramatic pause
                setTimeout(() => {
                    showResults(winners);
                }, 800);
            }, shakeDuration);
        }, 100);
    }

    function showResults(winners) {
        finalWinners.innerHTML = '';
        finalWinners.classList.remove('high-count');
        const count = winners.length;

        // Use Flexbox for better centering and natural wrapping
        finalWinners.style.display = 'flex';
        finalWinners.style.flexWrap = 'wrap';
        finalWinners.style.justifyContent = 'center';

        let cardWidth;
        if (count === 1) {
            fontSize = 'clamp(2.5rem, 10vw, 5rem)';
            padding = '3rem 5rem';
            cardWidth = '100%';
        } else if (count <= 4) {
            fontSize = 'clamp(1.5rem, 5vw, 3rem)';
            padding = '2rem';
            cardWidth = 'calc(45% - 1rem)';
        } else if (count <= 9) {
            fontSize = 'clamp(1.2rem, 3vw, 2rem)';
            padding = '1.5rem';
            cardWidth = 'calc(30% - 1rem)';
        } else if (count <= 12) {
            fontSize = 'clamp(1rem, 2.5vw, 1.5rem)';
            padding = '1rem 1.5rem';
            cardWidth = 'calc(23% - 1rem)';
        } else if (count <= 20) {
            fontSize = 'clamp(0.8rem, 2vw, 1.2rem)';
            padding = '0.8rem 1rem';
            cardWidth = 'calc(18% - 0.5rem)';
            finalWinners.classList.add('high-count');
        } else {
            fontSize = 'clamp(0.7rem, 1.5vw, 1rem)';
            padding = '0.6rem 0.8rem';
            cardWidth = '150px';
            finalWinners.classList.add('high-count');
        }

        winners.forEach((winner, index) => {
            const card = document.createElement('div');
            card.className = 'final-winner-card';

            const nameSpan = document.createElement('span');
            nameSpan.innerText = winner;
            nameSpan.style.fontSize = fontSize;

            const redrawBtn = document.createElement('button');
            redrawBtn.className = 'redraw-card-btn';
            redrawBtn.innerHTML = '&times;';
            redrawBtn.title = 'Redraw this winner';

            redrawBtn.onclick = (e) => {
                e.stopPropagation();
                if (poolNames.length === 0) {
                    alert('No more names left in the pool!');
                    return;
                }

                // Selection effect
                card.classList.add('replacing');

                setTimeout(() => {
                    const newIdx = Math.floor(Math.random() * poolNames.length);
                    const newWinner = poolNames.splice(newIdx, 1)[0];

                    nameSpan.innerText = newWinner;
                    nameListInput.value = poolNames.join('\n');

                    card.classList.remove('replacing');
                    card.classList.add('new-reveal');
                    setTimeout(() => card.classList.remove('new-reveal'), 1000);
                }, 400);
            };

            card.appendChild(nameSpan);
            card.appendChild(redrawBtn);
            card.style.padding = padding;
            card.style.flexBasis = cardWidth;
            card.style.animationDelay = `${index * 0.1}s`;
            finalWinners.appendChild(card);
        });

        diceContainer?.classList.add('hidden');
        resultOverlay.classList.remove('hidden');
    }
});
