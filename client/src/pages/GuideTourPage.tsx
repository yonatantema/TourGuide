import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { recognizeArtwork } from "../services/artworkApi";

type CameraStatus = "pending" | "active" | "denied";
type RecognitionState = "idle" | "loading" | "not-recognized";

export default function GuideTourPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("pending");
  const [recognitionState, setRecognitionState] =
    useState<RecognitionState>("idle");

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
        setCameraStatus("active");
      })
      .catch(() => {
        setCameraStatus("denied");
      });

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8);

    setRecognitionState("loading");

    try {
      const result = await recognizeArtwork(imageDataUrl);
      if (result.recognized) {
        // Success flow will be implemented later
        setRecognitionState("idle");
      } else {
        setRecognitionState("not-recognized");
      }
    } catch {
      setRecognitionState("not-recognized");
    }
  };

  const dismissModal = () => {
    setRecognitionState("idle");
  };

  const showModal = recognitionState !== "idle";

  return (
    <div className="min-h-screen px-6 py-10 max-w-5xl mx-auto flex flex-col">
      <div className="flex items-start justify-between mb-8">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900">
          Museum Guide
        </h1>
        <Link
          to="/guides"
          className="mt-2 px-4 py-2 border-2 border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Change Guide
        </Link>
      </div>

      <div className="bg-cream rounded-xl overflow-hidden relative">
        {cameraStatus === "pending" && (
          <div className="bg-gray-200 flex items-center justify-center aspect-[16/10] rounded-xl">
            <p className="text-gray-500">Camera access required</p>
          </div>
        )}

        {cameraStatus === "denied" && (
          <div className="bg-gray-200 flex items-center justify-center aspect-[16/10] rounded-xl">
            <p className="text-gray-500">
              Camera access was denied. Please allow camera access and reload.
            </p>
          </div>
        )}

        <div className={cameraStatus === "active" ? "relative" : "hidden"}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-[16/10] object-cover rounded-xl"
          />

          {/* Modal overlay */}
          {showModal && (
            <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
              {/* Close button */}
              <button
                onClick={dismissModal}
                className="absolute top-4 right-4 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity"
              >
                &times;
              </button>

              {recognitionState === "loading" && (
                <div className="flex flex-col items-center gap-4">
                  <h2 className="text-white text-xl font-serif font-bold">
                    Artwork Recognition
                  </h2>
                  <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  <p className="text-white/70 text-sm">
                    Identifying artwork...
                  </p>
                </div>
              )}

              {recognitionState === "not-recognized" && (
                <div className="flex flex-col items-center gap-4">
                  <h2 className="text-white text-xl font-serif font-bold">
                    No Artwork Recognized
                  </h2>
                  <p className="text-gray-300 text-sm text-center px-8">
                    We couldn't identify an artwork from your photo. Try
                    pointing your camera directly at an artwork.
                  </p>
                  <button
                    onClick={dismissModal}
                    className="mt-2 px-6 py-2 bg-white text-gray-900 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Capture button — hidden when modal is visible */}
          {!showModal && (
            <button
              onClick={handleCapture}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <span className="w-3.5 h-3.5 bg-accent rounded-full" />
            </button>
          )}
        </div>

        {cameraStatus === "pending" && (
          <button className="absolute bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <span className="w-3.5 h-3.5 bg-accent rounded-full" />
          </button>
        )}
      </div>

      {/* Retake button below camera when modal is visible */}
      {showModal && (
        <div className="flex justify-center mt-4">
          <button
            onClick={dismissModal}
            className="px-6 py-2 border-2 border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Retake
          </button>
        </div>
      )}
    </div>
  );
}
