
//function setup camera/akses kamera
let video, videoWidth, videoHeight;
async function setupCamera() {
  video = document.getElementById('video');

  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': { facingMode: 'user' },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

//function setup canvas
let canvas, canvasCtx;
async function setupCanvas() {
  canvas = document.getElementById('output');
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  canvasCtx = canvas.getContext('2d');
  canvasCtx.fillStyle = "rgba(255, 0, 0, 0.5)";
}

//function remove canvas
async function removeCanvas() {
  try {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
     console.log('canvasCtx remove');
  } catch (err) {
    console.log('canvasCtx cannot remove');
  }
}

//function deteksi wajah (face detection)
let faceDetectionModel;
async function loadFaceDetectionModel() {
  console.log("loading face detection model");
  await blazeface.load().then(m => {
    faceDetectionModel = m;
    console.log("face detection model loaded");
  });
}

//function load model
let ExpressionDetectionModel;
let datasetpathex;

async function loadExpressionDetectionModel() {
  console.log("loading expression detection model");
  await tf.loadLayersModel(datasetpathex).then(m => {
    ExpressionDetectionModel = m;
    console.log("expression detection model loaded");
  });
}

//function prediksi
const returnTensors = false;
const flipHorizontal = true;
const annotateBoxes = false;
const offset = tf.scalar(127.5);

async function renderPrediction() {
  // Get image from webcame
  let img = tf.tidy(() => tf.browser.fromPixels(video));

  // Detect faces
  let faces = [];
  try {
    faces = await faceDetectionModel.estimateFaces(img, returnTensors, flipHorizontal, annotateBoxes);
  } catch (e) {
    console.error("estimateFaces:", e);
    return;
  }
  if (faces.length > 0) {
    for (let i = 0; i < faces.length; i++) {
      let predictions = [];

      let face = tf.tidy(() => img.resizeNearestNeighbor([224, 224])
        .toFloat().sub(offset).div(offset).expandDims(0));

      try {
        predictions = await ExpressionDetectionModel.predict(face).data();
      } catch (e){
        console.error("ExpressionDetection:", e);
        return;
      }

      face.dispose();

      const start = faces[i].topLeft;
      const end = faces[i].bottomRight;
      const size = [end[0] - start[0], end[1] - start[1]];

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      // let faceBoxStyle = "rgba(0, 255, 0, 0.25)";
      let faceBoxStyle = "rgba(255, 0, 0, 0.25)";
      let label = "Loading..";
      let labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
      if (predictions.length > 0) {
        document.getElementById('angry').value = predictions[0] * 100;
        document.getElementById('disgust').value = predictions[1] * 100;
        document.getElementById('fear').value = predictions[2] * 100;
        document.getElementById('happy').value = predictions[3] * 100;
        document.getElementById('sad').value = predictions[4] * 100;
        document.getElementById('surprise').value = predictions[5] * 100;
        document.getElementById('neutral').value = predictions[6] * 100;
        // console.log(predictions[0]);
        var indexOfMaxValue = predictions.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
        label = indexOfMaxValue;
        for( let a = 0; a < labels.length; a++){
          if(indexOfMaxValue == a){
            label = labels[a];
          }
        }

        // Render label and its box
        canvasCtx.fillStyle = "rgba(255, 111, 0, 0.85)";
        canvasCtx.fillRect(start[0], start[1] - 23, size[0], 23);
        canvasCtx.font = "18px Raleway";
        canvasCtx.fillStyle = "rgba(255, 255, 255, 1)";
        canvasCtx.fillText(label, end[0] + 5, start[1] - 5);
      }

      canvasCtx.fillStyle = faceBoxStyle;
      canvasCtx.fillRect(start[0], start[1], size[0], size[1]);

      break;
    }
  }

  img.dispose();
  requestAnimationFrame(renderPrediction);
}

//start streaming video
async function showStreaming() {
  await setupCamera();
  video.play();

  videoWidth = video.videoWidth;
  videoHeight = video.videoHeight;
  video.width = videoWidth;
  video.height = videoHeight;
}

//stop streaming video
async function stopStreaming() {
  video = document.getElementById('video');

  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': { facingMode: 'user' },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
  video.getTracks().forEach(function(track) {
    track.stop();
  });
}

//deteksi ekspresi
async function detectionExpression() {

}

//action

showStreaming();

//button click condition
const btn = document.querySelector("button");
const cnv = document.querySelector("canvas");
const effect = document.getElementById('effect');

btn.addEventListener("click", doDetection);
async function doDetection() {
  if (btn.textContent === "Start Detection") {
    var sel = document.getElementById('scripts');
    var jenismodel = sel.options[sel.selectedIndex].value;
    datasetpathex = jenismodel;
    console.log(datasetpathex);
    video.play();
    setupCanvas();

    await loadFaceDetectionModel();
    await loadExpressionDetectionModel();

    renderPrediction();
    btn.textContent = "Stop Detection";
    btn.setAttribute('style', 'background: green');
    cnv.removeAttribute('style', 'display: none');
    effect.setAttribute('style', 'display: block');
  } else {
    effect.removeAttribute('style', 'display: block');
    effect.setAttribute('style', 'display: none');
    stopStreaming();
    btn.textContent = "Start Detection";
    btn.removeAttribute('style', 'background: green');
    cnv.setAttribute('style', 'display: none');
    showStreaming();
  }
}
