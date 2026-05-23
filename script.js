const canvas = document.getElementById('heartCanvas');
const ctx = canvas.getContext('2d');
const audio = document.getElementById('bgMusic');

audio.volume = 0.5;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars(); 
}
window.addEventListener('resize', resize);

const points = [];
const totalPoints = 350; 
const textPhrase = "i love you, Xenia";

const flyingPhrasesList = [
    "you are the most beautiful",
    "happy birthday, darling",
    "i want you"
];

const flyingPhrases = [];

let lastPhraseSpawnTime = 0;
const SPAWN_COOLDOWN = 2000;

const stars = [];
const totalStars = 120; 

function initStars() {
    stars.length = 0;
    for (let i = 0; i < totalStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.5 + 0.5, 
            alpha: Math.random(), 
            twinkleSpeed: 0.01 + Math.random() * 0.03, 
            phase: Math.random() * Math.PI * 2, 
            depth: 0.2 + Math.random() * 0.8 
        });
    }
}

for (let i = 0; i < totalPoints; i++) {
    const t = Math.PI * (-1 + 2 * i / totalPoints);
    const phi = Math.PI * 2 * (i * 0.15); 
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
    const z = Math.sin(phi) * Math.cos(t) * 5; 
    points.push({ x, y, z });
}

let currentAngleY = 0, currentAngleX = 0;
let targetAngleY = 0, targetAngleX = 0;

let clickPos = { x: -1000, y: -1000 };
let pulseProgress = 0;                 
const pulseRadius = 120;               

let audioContext, analyser, dataArray;
let isAudioInitialized = false;
let musicPulseScale = 1.0; 

function initAudio() {
    if (isAudioInitialized) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64; 
        const source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        isAudioInitialized = true;
    } catch (e) {
        console.log(e);
    }
}

function playMusic() {
    initAudio();
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (audio.paused) {
        audio.play().catch(err => console.log(err));
    }
}

function spawnFlyingPhrase(startX, startY) {
    const randomIndex = Math.floor(Math.random() * flyingPhrasesList.length);
    const text = flyingPhrasesList[randomIndex];
    
    flyingPhrases.push({
        text: text,
        x: startX,
        y: startY,
        startX: startX,
        vy: -(1.0 + Math.random() * 1.3),
        wobbleSpeed: 0.02 + Math.random() * 0.03,
        wobbleAmplitude: 15 + Math.random() * 20,
        wobblePhase: Math.random() * Math.PI * 2,
        alpha: 0,
        life: 0,
        maxLife: 110 + Math.floor(Math.random() * 40),
        baseScale: 13 + Math.random() * 3
    });
}

function handleScreenClick(clientX, clientY) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
    
    const baseScale = Math.min(canvas.width, canvas.height) * 0.015;
    const heartClickRadius = baseScale * 18; 

    if (distanceToCenter <= heartClickRadius) {
        clickPos = { x: clientX, y: clientY };
        pulseProgress = 1.0;
        playMusic();
        
        const currentTime = Date.now();
        if ((currentTime - lastPhraseSpawnTime) >= SPAWN_COOLDOWN) {
            spawnFlyingPhrase(clientX, clientY);
            lastPhraseSpawnTime = currentTime;
        }
    }
}

window.addEventListener('mousedown', (e) => handleScreenClick(e.clientX, e.clientY));
window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) handleScreenClick(e.touches[0].clientX, e.touches[0].clientY);
});

function updateRotation(clientX, clientY) {
    targetAngleY = ((clientX / window.innerWidth) - 0.5) * Math.PI * 2;
    targetAngleX = -((clientY / window.innerHeight) - 0.5) * Math.PI;
}
window.addEventListener('mousemove', (e) => updateRotation(e.clientX, e.clientY));
window.addEventListener('touchmove', (e) => {
    if(e.touches.length > 0) updateRotation(e.touches[0].clientX, e.touches[0].clientY);
});

resize(); 

function animate() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => {
        star.phase += star.twinkleSpeed;
        const currentAlpha = 0.2 + (Math.sin(star.phase) + 1) * 0.4 * star.alpha;

        const offsetX = currentAngleY * 30 * star.depth;
        const offsetY = currentAngleX * 30 * star.depth;

        let renderX = star.x - offsetX;
        let renderY = star.y - offsetY;

        if (renderX < 0) renderX += canvas.width;
        if (renderX > canvas.width) renderX -= canvas.width;
        if (renderY < 0) renderY += canvas.height;
        if (renderY > canvas.height) renderY -= canvas.height;

        ctx.beginPath();
        ctx.arc(renderX, renderY, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.fill();
    });

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (isAudioInitialized && !audio.paused) {
        analyser.getByteFrequencyData(dataArray);
        let bassSum = 0;
        for (let i = 0; i < 4; i++) bassSum += dataArray[i];
        let averageBass = bassSum / 4; 
        musicPulseScale = 1.0 + (averageBass / 255) * 0.22; 
    } else {
        musicPulseScale += (1.0 - musicPulseScale) * 0.1;
    }

    const baseScale = Math.min(canvas.width, canvas.height) * 0.015;
    const currentScale = baseScale * musicPulseScale;

    if (pulseProgress > 0) pulseProgress -= 0.04;

    currentAngleY += (targetAngleY - currentAngleY) * 0.08;
    currentAngleX += (targetAngleX - currentAngleX) * 0.08;
    targetAngleY += 0.002; 

    const sinY = Math.sin(currentAngleY), cosY = Math.cos(currentAngleY);
    const sinX = Math.sin(currentAngleX), cosX = Math.cos(currentAngleX);

    const transformedPoints = points.map(p => {
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.x * sinY + p.z * cosY;
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = p.y * sinX + z1 * cosX;
        return { x: x1, y: y2, z: z2 };
    });

    transformedPoints.sort((a, b) => a.z - b.z);

    transformedPoints.forEach(p => {
        const perspective = 30 / (30 + p.z); 
        const screenX = cx + p.x * currentScale * perspective;
        const screenY = cy + p.y * currentScale * perspective;

        let fontSize = Math.max(6, Math.floor(12 * perspective));
        let alpha = (p.z + 15) / 30;

        if (pulseProgress > 0) {
            const dx = screenX - clickPos.x;
            const dy = screenY - clickPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < pulseRadius) {
                const effectIntensity = (1 - (distance / pulseRadius)) * pulseProgress;
                fontSize += effectIntensity * 10;
                alpha = Math.min(1, alpha + effectIntensity * 0.5);
            }
        }

        ctx.font = `bold ${fontSize}px monospace`;
        ctx.fillStyle = `rgba(157, 0, 255, ${Math.max(0.15, Math.min(1, alpha))})`; 
        ctx.fillText(textPhrase, screenX, screenY);
    });

    for (let i = flyingPhrases.length - 1; i >= 0; i--) {
        const fp = flyingPhrases[i];
        
        fp.life++;
        fp.y += fp.vy;
        
        const progress = fp.life / fp.maxLife;
        fp.x = fp.startX + Math.sin(fp.life * fp.wobbleSpeed + fp.wobblePhase) * fp.wobbleAmplitude * progress;
        
        if (progress < 0.2) {
            fp.alpha = progress / 0.2;
        } else if (progress > 0.6) {
            fp.alpha = (1 - progress) / 0.4;
        } else {
            fp.alpha = 1;
        }

        if (fp.life >= fp.maxLife) {
            flyingPhrases.splice(i, 1);
            continue;
        }
        
        const currentScale = fp.baseScale * (1 + progress * 0.3);
        
        ctx.font = `italic bold ${currentScale}px monospace`;
        ctx.fillStyle = `rgba(157, 0, 255, ${fp.alpha * 0.85})`;
        ctx.textAlign = "center";
        
        ctx.shadowBlur = 10 * fp.alpha;
        ctx.shadowColor = "rgba(157, 0, 255, 0.6)";
        
        ctx.fillText(fp.text, fp.x, fp.y);
    }
    
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";

    requestAnimationFrame(animate);
}

animate();
