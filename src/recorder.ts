// export interface ScreenRecorderOptions {
//     micAudio: boolean;
// }

export class ScreenRecorder extends EventTarget {
    private currentlyRecording: boolean = false;
    private mediaRecorder?: MediaRecorder | null;
    private mediaStream?: MediaStream | null;
    private mediaTracks: MediaStreamTrack[] = [];
    private screenCaptureStream?: MediaStream | null;
    private audioCaptureStream?: MediaStream | null;
    private chunks: BlobEvent["data"][] = [];
    private availableMics?: MediaDeviceInfo[] | null;
    private microphone?: MediaDeviceInfo | null;
    private recordingBlob?: Blob | null;

    public videoPreviewElement?: HTMLVideoElement;

    constructor(videoPreviewElement?: HTMLVideoElement) {
        super();
        this.videoPreviewElement = videoPreviewElement;
    }

    public async loadMics() {
        await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
        });

        const devices = await navigator.mediaDevices.enumerateDevices();
        this.availableMics = devices.filter(
            (device) => device.kind == "audioinput"
        );
    }

    public async getAvailableMics() {
        if (!this.availableMics) {
            await this.loadMics();
        }

        return this.availableMics!;
    }

    public async selectMic(micId: string | null) {
        if (this.currentlyRecording)
            throw new Error("Recording is currently in progress.");

        if (micId === null) {
            this.microphone = null;
        }

        if (!this.availableMics) {
            await this.loadMics();
        }

        const microphone = this.availableMics!.find(
            (mic) => mic.deviceId == micId
        );

        if (!microphone) {
            throw new Error(`No microphone with ID ${micId} found.`);
        }

        this.microphone = microphone;
    }

    public async startRecording() {
        if (this.currentlyRecording)
            throw new Error("Recording is currently in progress.");

        if (this.microphone) {
            this.audioCaptureStream = await navigator.mediaDevices.getUserMedia(
                {
                    video: false,
                    audio: {
                        deviceId: this.microphone.deviceId,
                        noiseSuppression: false,
                        echoCancellation: false,
                    },
                }
            );
            this.mediaTracks.push(...this.audioCaptureStream.getAudioTracks());
        }

        this.screenCaptureStream = await navigator.mediaDevices.getDisplayMedia(
            {
                video: true,
                audio: true,
            }
        );
        this.mediaTracks.push(...this.screenCaptureStream.getVideoTracks());
        console.log(this.mediaTracks);

        this.mediaStream = new MediaStream(this.mediaTracks);
        this.mediaRecorder = new MediaRecorder(this.mediaStream, {
            mimeType: `video/webm; codecs=vp8${this.microphone ? ",opus" : ""}`,
        });

        this.mediaRecorder.addEventListener("dataavailable", (e) => {
            this.chunks.push(e.data);
        });

        this.mediaRecorder.addEventListener("start", () => {
            this.currentlyRecording = true;
            if (this.videoPreviewElement) {
                this.videoPreviewElement.srcObject = this.screenCaptureStream!;
            }
            this.dispatchEvent(new CustomEvent("recordingStart"));
        });

        this.mediaRecorder.addEventListener("stop", () => {
            this.currentlyRecording = false;
            if (this.videoPreviewElement) {
                this.videoPreviewElement.srcObject = null;
            }
            this.recordingBlob = new Blob(this.chunks, { type: "video/webm" });
            this.dispatchEvent(
                new CustomEvent("recordingStop", {
                    detail: { data: this.recordingBlob },
                })
            );
            this._destroy();
        });

        this.mediaRecorder.start();
    }

    public async stopRecording() {
        if (!this.currentlyRecording || !this.mediaRecorder)
            throw new Error("A recording has not been started yet.");

        this.mediaRecorder.stop();
    }

    private async _destroy() {
        this.mediaRecorder = null;
        this.mediaStream = null;
        this.mediaTracks = [];
        this.screenCaptureStream = null;
        this.audioCaptureStream = null;
        this.chunks = [];
        this.recordingBlob = null;
    }
}
