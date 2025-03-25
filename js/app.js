const video = document.getElementById('video');
const overlay = document.getElementById('overlay');

// Cargar imagen de referencia
const referenceImage = new Image();
referenceImage.src = './images/hands_reference.jpg';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Cargar modelos
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
            faceapi.nets.faceExpressionNet.loadFromUri('./models'),
            faceapi.nets.ageGenderNet.loadFromUri('./models')
        ]);

        // Analizar imagen de referencia
        const referenceCanvas = document.createElement('canvas');
        referenceCanvas.width = referenceImage.width;
        referenceCanvas.height = referenceImage.height;
        const refCtx = referenceCanvas.getContext('2d');
        refCtx.drawImage(referenceImage, 0, 0);
        
        // Iniciar video
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 720,
                height: 560
            } 
        });
        video.srcObject = stream;
    } catch (err) {
        console.error('Error:', err);
    }
});

// Función para detectar posición de dedos
function detectFingerPosition(landmarks) {
    const fingerTips = {
        thumb: landmarks[4],
        index: landmarks[8],
        middle: landmarks[12],
        ring: landmarks[16],
        pinky: landmarks[20]
    };
    
    return fingerTips;
}

video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);
    
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);
    
    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, 
            new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withHandLandmarks();
            
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar detecciones
        if (resizedDetections.length > 0) {
            resizedDetections.forEach(detection => {
                const fingerPositions = detectFingerPosition(detection.landmarks);
                
                // Dibujar puntos en los dedos
                ctx.fillStyle = '#00ff00';
                Object.values(fingerPositions).forEach(position => {
                    ctx.beginPath();
                    ctx.arc(position.x, position.y, 5, 0, 2 * Math.PI);
                    ctx.fill();
                });
                
                // Mostrar información
                ctx.fillStyle = 'white';
                ctx.font = '16px Arial';
                ctx.fillText('Dedos detectados:', 10, 30);
                Object.keys(fingerPositions).forEach((finger, index) => {
                    ctx.fillText(`${finger}: detectado`, 10, 60 + (index * 25));
                });
            });
        }
    }, 100);
});

let videoElement = document.getElementById('video');
let canvasElement = document.getElementById('overlay');
let ctx = canvasElement.getContext('2d');

// Configurar MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

// Configurar dimensiones
videoElement.width = 720;
videoElement.height = 560;
canvasElement.width = videoElement.width;
canvasElement.height = videoElement.height;

// Procesar resultados
hands.onResults((results) => {
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks, handIndex) => {
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, 
                {color: '#00FF00', lineWidth: 2});
            drawLandmarks(ctx, landmarks, 
                {color: '#FF0000', lineWidth: 1});

            const fingerStates = checkFingers(landmarks);
            displayFingerInfo(ctx, fingerStates, handIndex);
        });
    }
});

function checkFingers(landmarks) {
    const tipIds = [4, 8, 12, 16, 20];
    const pipIds = [3, 7, 11, 15, 19];

    const fingerStates = {
        'Pulgar': landmarks[tipIds[0]].y < landmarks[pipIds[0]].y,
        'Índice': landmarks[tipIds[1]].y < landmarks[pipIds[1]].y,
        'Medio': landmarks[tipIds[2]].y < landmarks[pipIds[2]].y,
        'Anular': landmarks[tipIds[3]].y < landmarks[pipIds[3]].y,
        'Meñique': landmarks[tipIds[4]].y < landmarks[pipIds[4]].y
    };

    return fingerStates;
}

function displayFingerInfo(ctx, fingerStates, handIndex) {
    ctx.fillStyle = 'white';
    ctx.fillRect(10, 10 + (handIndex * 150), 150, 130);
    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    
    let y = 35 + (handIndex * 150);
    ctx.fillText(`Mano ${handIndex + 1}:`, 20, y);
    Object.entries(fingerStates).forEach(([finger, isExtended]) => {
        y += 20;
        ctx.fillText(`${finger}: ${isExtended ? '↑' : '↓'}`, 20, y);
    });
}

// Iniciar cámara
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 720,
    height: 560
});

camera.start();