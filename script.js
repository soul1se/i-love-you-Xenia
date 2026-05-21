const canvas = document.getElementById('heartCanvas');
const ctx = canvas.getContext('2d');
const audio = document.getElementById('bgMusic');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const points = [];
const totalPoints = 350; 
const textPhrase = "i love you, Xenia";

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

function handleScreenClick(clientX, clientY) {
    clickPos = { x: clientX, y: clientY };
    pulseProgress = 1.0;
    playMusic();
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

function animate() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    requestAnimationFrame(animate);
}

animate();
