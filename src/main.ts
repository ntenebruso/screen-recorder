import "./styles/style.css";
import { ScreenRecorder } from "./recorder";

const startBtn = <HTMLButtonElement>document.getElementById("startBtn");
const stopBtn = <HTMLButtonElement>document.getElementById("stopBtn");
const downloadLink = <HTMLAnchorElement>document.getElementById("downloadLink");
const videoPreviewElement = <HTMLVideoElement>(
    document.getElementById("preview")
);
const recordingIndicator = <HTMLDivElement>(
    document.getElementById("recordingIndicator")
);
const micInput = <HTMLSelectElement>document.getElementById("micInput");

const recorder = new ScreenRecorder(videoPreviewElement);

window.addEventListener("DOMContentLoaded", populateMics);
micInput.addEventListener("change", selectMic);

startBtn.addEventListener("click", startStream);
stopBtn.addEventListener("click", stopStream);

async function populateMics() {
    console.log("HIHI");
    const mics = await recorder.getAvailableMics();
    mics.forEach((mic) => {
        var option = document.createElement("option");
        option.innerHTML = mic.label;
        option.dataset.micId = mic.deviceId;
        micInput.appendChild(option);
    });
}

function selectMic() {
    const selectedMic = micInput.options[micInput.selectedIndex].dataset.micId;
    if (selectedMic) recorder.selectMic(selectedMic);
    else recorder.selectMic(null);
}

function startStream() {
    recorder.startRecording();
}

recorder.addEventListener("recordingStart", () => {
    videoPreviewElement.controls = false;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    micInput.disabled = true;
    recordingIndicator.style.display = "inline-block";
});

function stopStream() {
    recorder.stopRecording();
}

recorder.addEventListener("recordingStop", (e) => {
    videoPreviewElement.controls = true;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    micInput.disabled = true;
    recordingIndicator.style.display = "none";

    const blobURL = URL.createObjectURL(e.detail.data);
    videoPreviewElement.src = blobURL;
    downloadLink.style.display = "inline-block";
    downloadLink.href = blobURL;
});
