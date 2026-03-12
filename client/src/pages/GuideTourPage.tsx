import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

type CameraStatus = "pending" | "active" | "denied";

export default function GuideTourPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("pending");

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

  return (
    <div className="min-h-screen px-6 py-10 max-w-5xl mx-auto flex flex-col">
      <div className="flex items-start justify-between mb-8">
        <h1 className="font-serif text-5xl md:text-6xl font-bold text-gray-900">
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
          <div className="bg-gray-200 flex items-center justify-center aspect-[3/4] rounded-xl">
            <p className="text-gray-500">Camera access required</p>
          </div>
        )}

        {cameraStatus === "denied" && (
          <div className="bg-gray-200 flex items-center justify-center aspect-[3/4] rounded-xl">
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
            className="w-full aspect-[3/4] object-cover rounded-xl"
          />
          <button className="absolute bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <span className="w-3.5 h-3.5 bg-accent rounded-full" />
          </button>
        </div>

        {cameraStatus === "pending" && (
          <button className="absolute bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <span className="w-3.5 h-3.5 bg-accent rounded-full" />
          </button>
        )}
      </div>
    </div>
  );
}
