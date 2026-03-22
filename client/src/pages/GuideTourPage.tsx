import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { recognizeArtwork, getArtwork, Artwork, UPLOADS_URL } from "../services/artworkApi";
import ConversationModal from "./ConversationPage";
import temaLogo from "../assets/tema-logo.png";

type CameraStatus = "pending" | "active" | "denied";
type RecognitionState = "idle" | "loading" | "not-recognized" | "recognized" | "conversation";

const translations: Record<string, Record<string, string>> = {
  english: {
    title: "Take a Photo",
    description: "Point your camera at an artwork and snap a photo to start a conversation about it.",
    switchGuide: "Switch Guide",
    cameraRequired: "Camera access required",
    cameraDenied: "Camera access was denied. Please allow camera access and reload.",
    artworkRecognition: "Artwork Recognition",
    identifying: "Identifying artwork...",
    noArtwork: "No Artwork Recognized",
    noMatch: "Could not match this image to any artwork in our collection",
    tryAgain: "Try Again",
    talkAbout: "Let's talk about this artwork",
    fullDetails: "Full Details",
  },
  french: {
    title: "Prenez une Photo",
    description: "Dirigez votre appareil photo vers une œuvre d'art et prenez une photo pour commencer une conversation à son sujet.",
    switchGuide: "Changer de Guide",
    cameraRequired: "Accès à la caméra requis",
    cameraDenied: "L'accès à la caméra a été refusé. Veuillez autoriser l'accès et recharger.",
    artworkRecognition: "Reconnaissance d'œuvre",
    identifying: "Identification en cours...",
    noArtwork: "Aucune œuvre reconnue",
    noMatch: "Impossible de faire correspondre cette image à une œuvre de notre collection",
    tryAgain: "Réessayer",
    talkAbout: "Parlons de cette œuvre d'art",
    fullDetails: "Détails complets",
  },
};

export default function GuideTourPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("pending");
  const [recognitionState, setRecognitionState] =
    useState<RecognitionState>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recognizedArtwork, setRecognizedArtwork] = useState<Artwork | null>(null);
  const [language, setLanguage] = useState("english");
  const t = translations[language] || translations.english;

  useEffect(() => {
    if (location.state?.restoredArtwork) {
      setRecognizedArtwork(location.state.restoredArtwork);
      setRecognitionState("recognized");
    }
  }, []);

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

    setCapturedImage(imageDataUrl);
    setRecognitionState("loading");

    try {
      const result = await recognizeArtwork(imageDataUrl);
      if (result.recognized && result.artworkId) {
        try {
          const artwork = await getArtwork(result.artworkId);
          await new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = `${UPLOADS_URL}/${artwork.image_filename}`;
          });
          setRecognizedArtwork(artwork);
          setRecognitionState("recognized");
        } catch {
          setRecognitionState("not-recognized");
        }
      } else {
        setRecognitionState("not-recognized");
      }
    } catch {
      setRecognitionState("not-recognized");
    }
  };

  const dismissModal = () => {
    setCapturedImage(null);
    setRecognizedArtwork(null);
    setRecognitionState("idle");
  };

  const showModal = recognitionState !== "idle" && recognitionState !== "conversation";

  return (
    <div className="min-h-screen px-6 py-10 max-w-[62rem] mx-auto flex flex-col">
      <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 text-center mb-3">
        {t.title}
      </h1>
      <p className="text-gray-500 text-center mb-6">
        {t.description}
      </p>

      <div className="bg-cream rounded-xl overflow-hidden relative">
        {cameraStatus === "pending" && (
          <div className="bg-gray-200 flex items-center justify-center aspect-[3/4] md:aspect-[16/9] rounded-xl">
            <p className="text-gray-500">{t.cameraRequired}</p>
          </div>
        )}

        {cameraStatus === "denied" && (
          <div className="bg-gray-200 flex items-center justify-center aspect-[3/4] md:aspect-[16/9] rounded-xl">
            <p className="text-gray-500">
              {t.cameraDenied}
            </p>
          </div>
        )}

        <div className={cameraStatus === "active" ? "relative" : "hidden"}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-[3/4] md:aspect-[16/9] object-cover rounded-xl"
          />
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured frame"
              className="absolute inset-0 w-full h-full object-cover rounded-xl"
            />
          )}

          {/* Capture button — hidden when modal is visible */}
          {!showModal && (
            <button
              onClick={handleCapture}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[68px] h-[68px] bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <span className="w-[58px] h-[58px] bg-accent rounded-full" />
            </button>
          )}
        </div>

        {cameraStatus === "pending" && (
          <button className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[68px] h-[68px] bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <span className="w-[58px] h-[58px] bg-accent rounded-full" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <Link
          to="/guides"
          className="px-5 py-3 border-2 border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          {t.switchGuide}
        </Link>
        <Link to="/">
          <img src={temaLogo} alt="TEMA" className="w-14" />
        </Link>
      </div>

      {/* Full-page dark overlay + modal card */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center px-6">
          {/* Modal card */}
          <div className={`bg-cream rounded-xl shadow-lg w-[380px] relative flex flex-col overflow-hidden ${recognitionState === "recognized" ? "h-[80vh]" : ""}`}>
            {/* Close button — hidden on recognized state */}
            {recognitionState !== "recognized" && (
              <div className="p-6">
                <button
                  onClick={dismissModal}
                  className="absolute top-4 right-4 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity z-10"
                >
                  &times;
                </button>

                {recognitionState === "loading" && (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <h2 className="text-gray-900 text-xl font-serif font-bold self-start">
                      {t.artworkRecognition}
                    </h2>
                    <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin mt-4" />
                    <p className="text-gray-500 text-sm mt-2">
                      {t.identifying}
                    </p>
                  </div>
                )}

                {recognitionState === "not-recognized" && (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <h2 className="text-gray-900 text-xl font-serif font-bold self-start">
                      {t.noArtwork}
                    </h2>
                    <p className="text-gray-400 text-sm text-center mt-2">
                      {t.noMatch}
                    </p>
                    <button
                      onClick={dismissModal}
                      className="mt-2 px-8 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      {t.tryAgain}
                    </button>
                  </div>
                )}
              </div>
            )}

            {recognitionState === "recognized" && recognizedArtwork && (
              <div className="flex flex-col min-h-0 h-full">
                <div className="relative flex-1 min-h-0 flex items-center justify-center bg-black/5 rounded-t-xl overflow-hidden">
                  <img
                    src={`${UPLOADS_URL}/${recognizedArtwork.image_filename}`}
                    alt={recognizedArtwork.artwork_name}
                    className="max-w-full max-h-full object-contain"
                  />
                  <button
                    onClick={dismissModal}
                    className="absolute top-3 left-3 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition-colors cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>
                <div className="flex-shrink-0 px-5 py-4">
                  <div className="text-center mb-3">
                    <h2 className="font-serif text-base font-bold text-gray-900">
                      {recognizedArtwork.artwork_name}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      {recognizedArtwork.artist_name}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-white"
                    >
                      <option value="english">English</option>
                      <option value="french">French</option>
                    </select>
                    <button
                      onClick={() => setRecognitionState("conversation")}
                      className="w-full py-2.5 bg-accent text-white rounded-md text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      {t.talkAbout}
                    </button>
                    <button
                      onClick={() => navigate(`/artwork/${recognizedArtwork.id}`, { state: { guideId: id, artwork: recognizedArtwork } })}
                      className="w-full py-2.5 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors cursor-pointer"
                    >
                      {t.fullDetails}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Conversation modal */}
      {recognitionState === "conversation" && recognizedArtwork && id && (
        <ConversationModal
          artwork={recognizedArtwork}
          guideId={Number(id)}
          language={language}
          onClose={dismissModal}
        />
      )}
    </div>
  );
}
