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
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const minimizeNavbarBtn = document.getElementById('minimizeNavbarBtn');
    const expandNavbarBtn = document.getElementById('expandNavbarBtn');
    const navbar = document.querySelector('.navbar');
    const reshuffleBtn = document.getElementById('reshuffleBtn');

    let isShuffling = false;
    let poolNames = []; // Persistent pool across redraws/shuffles

    // Fullscreen Toggle
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    // Navbar Minimize Toggle
    minimizeNavbarBtn.addEventListener('click', () => {
        navbar.classList.add('minimized');
        expandNavbarBtn.classList.remove('hidden');
    });

    expandNavbarBtn.addEventListener('click', () => {
        navbar.classList.remove('minimized');
        expandNavbarBtn.classList.add('hidden');
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

    toggleSettings.addEventListener('click', () => {
        settingsCard.classList.toggle('collapsed');
    });

    shuffleBtn.addEventListener('click', () => {
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

        settingsCard.classList.add('collapsed');

        // Initialize or update pool from textarea
        const freshNames = nameListInput.value
            .split(/[\n,]+/)
            .map(n => n.trim())
            .filter(n => n.length > 0);

        poolNames = freshNames;

        setTimeout(() => startDiceShake(poolNames, pickCount), 400);
    });

    resetBtn.addEventListener('click', () => {
        resultOverlay.classList.add('hidden');
        diceContainer.classList.add('hidden');
        initialScreen.classList.remove('hidden');
        shuffleBtn.disabled = false;
    });

    function startDiceShake(names, pickCount) {
        isShuffling = true;
        shuffleBtn.disabled = true;

        // Step 1: Hide Branding
        initialScreen.classList.add('hidden');
        resultOverlay.classList.add('hidden');

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

        // Define dynamic styles based on count
        let fontSize, padding, gridCols;
        if (count === 1) {
            fontSize = 'clamp(2.5rem, 10vw, 5rem)';
            padding = '3rem 5rem';
            gridCols = '1fr';
        } else if (count <= 4) {
            fontSize = 'clamp(1.5rem, 5vw, 3rem)';
            padding = '2rem';
            gridCols = 'repeat(2, 1fr)';
        } else if (count <= 9) {
            fontSize = 'clamp(1.2rem, 3vw, 2rem)';
            padding = '1.5rem';
        } else if (count <= 12) {
            fontSize = 'clamp(1rem, 2.5vw, 1.5rem)';
            padding = '1rem 1.5rem';
            gridCols = 'repeat(4, 1fr)';
        } else if (count <= 20) {
            fontSize = 'clamp(0.8rem, 2vw, 1.2rem)';
            padding = '0.8rem 1rem';
            gridCols = 'repeat(5, 1fr)';
            finalWinners.classList.add('high-count');
        } else {
            fontSize = 'clamp(0.7rem, 1.5vw, 1rem)';
            padding = '0.6rem 0.8rem';
            gridCols = 'repeat(auto-fit, minmax(130px, 1fr))';
            finalWinners.classList.add('high-count');
        }

        finalWinners.style.gridTemplateColumns = gridCols;

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
            card.style.animationDelay = `${index * 0.1}s`;
            finalWinners.appendChild(card);
        });

        resultOverlay.classList.remove('hidden');
    }
});
