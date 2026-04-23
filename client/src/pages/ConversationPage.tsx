import { useEffect, useRef, useState, useCallback } from "react";
import { Artwork, UPLOADS_URL } from "../services/artworkApi";
import { createRealtimeSession, reportConversationEnd } from "../services/conversationApi";
import { API_URL, getToken } from "../services/api";

// Only iOS Safari needs the playback-context teardown workarounds — those
// mitigate the earpiece/loudspeaker routing change triggered by getUserMedia.
// On other browsers the teardown costs a 200–500ms audio pipeline startup
// whenever the context is recreated, which clips the first word of the reply.
const IS_IOS =
  typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

type ConversationStatus =
  | "idle"
  | "connecting"
  | "ready"
  | "recording"
  | "processing"
  | "playing"
  | "error";

// Audio helpers
function resampleTo24kHz(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === 24000) return input;
  const ratio = inputRate / 24000;
  const len = Math.round(input.length / ratio);
  const output = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const srcIdx = i * ratio;
    const floor = Math.floor(srcIdx);
    const ceil = Math.min(floor + 1, input.length - 1);
    const frac = srcIdx - floor;
    output[i] = input[floor] * (1 - frac) + input[ceil] * frac;
  }
  return output;
}

function float32ToPcm16(float32: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm16;
}

function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768;
  }
  return float32;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

interface ConversationModalProps {
  artwork: Artwork;
  guideId: number;
  language: string;
  onClose: () => void;
}

export default function ConversationModal({
  artwork,
  guideId,
  language,
  onClose,
}: ConversationModalProps) {
  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [transcriptLog, setTranscriptLog] = useState<{ speaker: "guide" | "visitor"; text: string }[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [limitError, setLimitError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Int16Array[]>([]);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silentChunksRef = useRef(0);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  // Scheduled playback state. Each incoming audio chunk becomes an
  // AudioBufferSourceNode scheduled on the audio clock, which avoids the
  // main-thread timing jitter that ScriptProcessorNode suffers from on
  // Windows Chrome (the source of stutters during replies).
  const scheduledEndRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const statusRef = useRef<ConversationStatus>("idle");
  const currentGuideTextRef = useRef("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const conversationStartRef = useRef<number | null>(null);
  const remainingSecondsRef = useRef<number>(600);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptLog]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        playbackCtxRef.current?.resume();
        audioContextRef.current?.resume();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const reacquireMic = useCallback(async () => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = newStream;
      // If mid-recording, reconnect source to existing processor
      if (audioContextRef.current && processorRef.current) {
        sourceRef.current?.disconnect();
        const newSource = audioContextRef.current.createMediaStreamSource(newStream);
        newSource.connect(processorRef.current);
        sourceRef.current = newSource;
      }
      silentChunksRef.current = 0;
    } catch (err) {
      console.error("Failed to re-acquire microphone:", err);
    }
  }, []);

  useEffect(() => {
    const handleDeviceChange = () => {
      // Only re-acquire if actively recording — not during AI playback
      if (statusRef.current === "recording" && micStreamRef.current) {
        reacquireMic();
      }
    };
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, [reacquireMic]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    stopAllScheduledPlayback();
    playbackCtxRef.current?.close();
    playbackCtxRef.current = null;
    audioChunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      // Report duration on unmount (e.g., tab close)
      if (conversationStartRef.current) {
        const seconds = Math.round((Date.now() - conversationStartRef.current) / 1000);
        if (seconds > 0) {
          const token = getToken();
          fetch(`${API_URL}/api/conversation/end`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ durationSeconds: seconds }),
            keepalive: true,
          }).catch(() => {});
        }
        conversationStartRef.current = null;
      }
      cleanup();
    };
  }, [cleanup]);

  const ensurePlaybackStream = () => {
    if (playbackCtxRef.current) {
      if (playbackCtxRef.current.state === "suspended") {
        playbackCtxRef.current.resume();
      }
      return;
    }
    const ctx = new AudioContext({ sampleRate: 24000 });
    playbackCtxRef.current = ctx;
  };

  const enqueueAudio = (float32: Float32Array) => {
    ensurePlaybackStream();
    const ctx = playbackCtxRef.current!;
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    // First chunk of a reply gets a small jitter buffer so network variance
    // can't underrun the schedule. Subsequent chunks chain back-to-back on
    // the audio clock so playback is glitch-free regardless of main-thread
    // load.
    const JITTER_SEC = 0.12;
    const now = ctx.currentTime;
    const startAt = Math.max(now + JITTER_SEC, scheduledEndRef.current);
    source.start(startAt);
    scheduledEndRef.current = startAt + buffer.duration;

    activeSourcesRef.current.push(source);
    source.onended = () => {
      const i = activeSourcesRef.current.indexOf(source);
      if (i >= 0) activeSourcesRef.current.splice(i, 1);
      try { source.disconnect(); } catch {}
    };
  };

  const stopAllScheduledPlayback = () => {
    activeSourcesRef.current.forEach((s) => {
      try { s.stop(); } catch {}
      try { s.disconnect(); } catch {}
    });
    activeSourcesRef.current = [];
    scheduledEndRef.current = 0;
  };

  const handleStartConversation = async () => {
    setStatus("connecting");
    setLimitError(null);

    try {
      // Request mic access to trigger browser permission prompt, then release
      // so Safari exits "playAndRecord" mode during the AI greeting playback.
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getTracks().forEach((t) => t.stop());

      const { clientSecret, remainingSeconds } = await createRealtimeSession(guideId, artwork.id, language);
      remainingSecondsRef.current = remainingSeconds;

      const ws = new WebSocket(
        "wss://api.openai.com/v1/realtime?model=gpt-realtime-2025-08-28",
        [
          "realtime",
          `openai-insecure-api-key.${clientSecret}`,
          "openai-beta.realtime-v1",
        ]
      );

      ws.onopen = () => {
        // Trigger initial AI greeting
        ws.send(JSON.stringify({ type: "response.create" }));
        setStatus("playing");

        // Start conversation timer
        const startTime = Date.now();
        conversationStartRef.current = startTime;
        timerRef.current = setInterval(() => {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          setElapsedSeconds(elapsed);
          if (elapsed >= remainingSecondsRef.current) {
            // Auto-end: time limit reached
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            reportConversationEnd(elapsed).catch(console.error);
            conversationStartRef.current = null;
            cleanup();
            onClose();
          }
        }, 1000);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "response.audio.delta") {
          // Don't play audio while user is recording
          if (statusRef.current === "recording") return;
          const buf = base64ToArrayBuffer(data.delta);
          const pcm16 = new Int16Array(buf);
          const float32 = pcm16ToFloat32(pcm16);
          enqueueAudio(float32);
          if (statusRef.current !== "playing") {
            setStatus("playing");
          }
        }

        if (data.type === "response.audio_transcript.delta") {
          currentGuideTextRef.current += data.delta;
        }

        if (data.type === "response.audio_transcript.done") {
          const text = data.transcript || currentGuideTextRef.current;
          if (text) {
            setTranscriptLog(prev => [...prev, { speaker: "guide", text }]);
          }
          currentGuideTextRef.current = "";
        }

        if (data.type === "conversation.item.input_audio_transcription.completed") {
          setTranscriptLog(prev => [...prev, { speaker: "visitor", text: data.transcript }]);
        }

        if (data.type === "response.audio.done") {
          if (statusRef.current !== "playing") return;
          const ctx = playbackCtxRef.current;
          const remainingMs = ctx
            ? Math.max(0, (scheduledEndRef.current - ctx.currentTime) * 1000)
            : 0;
          setTimeout(() => {
            if (statusRef.current === "playing") {
              setStatus("ready");
            }
          }, remainingMs + 50);
        }

        if (data.type === "error") {
          console.error("Realtime API error:", data.error);
          // Ignore errors while recording — likely from response.cancel
          if (statusRef.current !== "recording") {
            setStatus("error");
          }
        }
      };

      ws.onerror = () => {
        setStatus("error");
      };

      ws.onclose = () => {
        if (
          statusRef.current !== "idle" &&
          statusRef.current !== "error"
        ) {
          setStatus("error");
        }
      };

      wsRef.current = ws;
    } catch (err: any) {
      if (err?.code === "USAGE_LIMIT_REACHED") {
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
        setLimitError("You've reached your monthly conversation time limit (10 min/month). Your limit resets at the start of next month.");
        setStatus("idle");
      } else {
        console.error("Failed to start conversation:", err);
        setStatus("error");
      }
    }
  };

  const startRecording = async () => {
    try {
      // Reuse existing mic stream or request a new one
      let stream = micStreamRef.current;
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
      }

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      audioChunksRef.current = [];
      currentGuideTextRef.current = "";
      silentChunksRef.current = 0;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Silence detection — re-acquire mic after ~1-2s of silence (Safari fallback)
        const energy = inputData.reduce((sum, s) => sum + Math.abs(s), 0);
        if (energy < 0.001) {
          silentChunksRef.current++;
          if (silentChunksRef.current > 20) {
            reacquireMic();
          }
        } else {
          silentChunksRef.current = 0;
        }
        const resampled = resampleTo24kHz(inputData, ctx.sampleRate);
        const pcm16 = float32ToPcm16(resampled);
        audioChunksRef.current.push(pcm16);
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      setStatus("recording");
    } catch (err) {
      console.error("Microphone access failed:", err);
      setStatus("error");
    }
  };

  const stopRecording = () => {
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    // Release mic stream so Safari exits "playAndRecord" audio session mode,
    // which eliminates system-level output AGC causing volume fluctuations.
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    // Only iOS Safari needs the playback context destroyed here — it keeps
    // audio routed through the earpiece until a fresh AudioContext is created
    // without an active mic stream. Other browsers keep it alive so the AI's
    // next reply starts instantly instead of waiting for a new audio pipeline.
    if (IS_IOS) {
      stopAllScheduledPlayback();
      playbackCtxRef.current?.close();
      playbackCtxRef.current = null;
    }

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setStatus("error");
      return;
    }

    // Concatenate all chunks
    const totalLength = audioChunksRef.current.reduce(
      (sum, chunk) => sum + chunk.length,
      0
    );
    const combined = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunksRef.current) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    audioChunksRef.current = [];

    // Discard recordings shorter than 0.5s to avoid phantom transcriptions
    if (combined.length < 12000) {
      setStatus("ready");
      return;
    }

    // Send audio in chunks
    const CHUNK_SIZE = 24000;
    for (let i = 0; i < combined.length; i += CHUNK_SIZE) {
      const slice = combined.slice(i, i + CHUNK_SIZE);
      const b64 = arrayBufferToBase64(slice.buffer);
      ws.send(
        JSON.stringify({ type: "input_audio_buffer.append", audio: b64 })
      );
    }

    ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
    ws.send(JSON.stringify({ type: "response.create" }));
    setStatus("processing");
  };

  const handleMicClick = () => {
    if (status === "recording") {
      stopRecording();
    } else if (status === "ready" || status === "playing" || status === "processing") {
      // Interrupt AI: cancel server response, stop audio, start recording
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "response.cancel" }));
      }
      // Stop every scheduled source so any in-flight AI audio goes silent
      // immediately. On iOS Safari also destroy the playback context — the
      // audio-session renegotiation during getUserMedia can otherwise leave
      // the output pipeline in a bad state.
      stopAllScheduledPlayback();
      if (IS_IOS) {
        playbackCtxRef.current?.close();
        playbackCtxRef.current = null;
      }
      // Update UI and block audio deltas immediately (before async getUserMedia)
      setStatus("recording");
      statusRef.current = "recording";
      startRecording();
    }
  };

  const handleEndConversation = () => {
    if (conversationStartRef.current) {
      const seconds = Math.round((Date.now() - conversationStartRef.current) / 1000);
      conversationStartRef.current = null;
      if (seconds > 0) {
        reportConversationEnd(seconds).catch(console.error);
      }
    }
    cleanup();
    onClose();
  };

  const micActive = status === "ready" || status === "recording" || status === "playing" || status === "processing";
  const showEndButton = status !== "idle";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center px-6">
      <div className="bg-cream rounded-xl shadow-lg max-w-lg max-h-[80vh] w-full p-3 relative flex flex-col items-center gap-4 overflow-hidden">
        {/* Artwork image */}
        <div className="w-full min-h-0">
          <img
            src={`${UPLOADS_URL}/${artwork.image_filename}`}
            alt={artwork.artwork_name}
            className="w-full h-full rounded-lg object-contain"
          />
        </div>

        {/* Artwork info */}
        <div className="text-center flex-shrink-0">
          <h2 className="font-serif text-xl font-bold text-gray-900">
            {artwork.artwork_name}
          </h2>
          <p className="text-gray-500 text-sm mt-1">{artwork.artist_name}</p>
        </div>

        {/* Idle state — Start button */}
        {status === "idle" && (
          <>
            {limitError && (
              <p className="text-red-500 text-sm text-center">{limitError}</p>
            )}
            {!limitError && (
              <button
                onClick={handleStartConversation}
                className="flex-shrink-0 w-full py-3 bg-accent text-white rounded-md text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer"
              >
                Start a Conversation
              </button>
            )}
          </>
        )}

        {/* Connecting */}
        {status === "connecting" && (
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Connecting...</p>
          </div>
        )}

        {/* Mic area */}
        {(status === "ready" ||
          status === "recording" ||
          status === "processing" ||
          status === "playing") && (
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <button
              onClick={handleMicClick}
              disabled={!micActive}
              className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                status === "recording"
                  ? "bg-red-500 text-white"
                  : micActive
                    ? "bg-accent text-white hover:opacity-80"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {status === "recording" && (
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
              )}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 relative z-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 10v1a7 7 0 01-14 0v-1M12 18v4m-4 0h8"
                />
              </svg>
            </button>
            <p className="text-gray-500 text-sm">
              {status === "ready" && "Click to talk"}
              {status === "recording" && "Listening... Click to send"}
              {status === "processing" && "Thinking..."}
              {status === "playing" && "Speaking... Click to interrupt"}
            </p>
            <p className="text-gray-400 text-xs">
              {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")} / {Math.floor(remainingSecondsRef.current / 60)}:{String(remainingSecondsRef.current % 60).padStart(2, "0")}
            </p>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <p className="text-gray-500 text-sm">Something went wrong</p>
            <button
              onClick={() => {
                cleanup();
                setStatus("idle");
              }}
              className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Show Transcript button */}
        {showEndButton && status !== "error" && (
          <button
            onClick={() => setShowTranscript(true)}
            className="flex-shrink-0 px-8 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors cursor-pointer"
          >
            Show Transcript
          </button>
        )}

        {/* End Conversation button */}
        {showEndButton && status !== "error" && (
          <button
            onClick={handleEndConversation}
            className="flex-shrink-0 px-8 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors cursor-pointer"
          >
            End Conversation
          </button>
        )}

        {/* Back button (only in idle) */}
        {status === "idle" && (
          <button
            onClick={onClose}
            className="flex-shrink-0 w-full py-3 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors cursor-pointer"
          >
            Back
          </button>
        )}
      </div>

      {/* Transcript modal */}
      {showTranscript && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex flex-col items-center justify-center px-6">
          <div className="bg-cream rounded-xl shadow-lg max-w-lg max-h-[80vh] w-full flex flex-col overflow-hidden">
            <div className="flex items-center px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <button
                onClick={() => setShowTranscript(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="font-serif text-lg font-bold text-gray-900 ml-2">Conversation</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {transcriptLog.length === 0 && (
                <p className="text-gray-400 text-sm text-center">No transcript yet</p>
              )}
              {transcriptLog.map((entry, i) => (
                <div key={i}>
                  <span className={`text-sm font-semibold ${entry.speaker === "guide" ? "text-gray-900" : "text-red-500"}`}>
                    {entry.speaker === "guide" ? "Guide:" : "Visitor:"}
                  </span>
                  <p className={`text-sm mt-0.5 ${entry.speaker === "guide" ? "text-gray-900" : "text-red-500"}`}>
                    {entry.text}
                  </p>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
            {micActive && (
              <div className="flex flex-col items-center gap-2 py-3 border-t border-gray-200 flex-shrink-0">
                <button
                  onClick={handleMicClick}
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    status === "recording"
                      ? "bg-red-500 text-white"
                      : "bg-accent text-white hover:opacity-80"
                  }`}
                >
                  {status === "recording" && (
                    <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
                  )}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 relative z-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 10v1a7 7 0 01-14 0v-1M12 18v4m-4 0h8"
                    />
                  </svg>
                </button>
                <p className="text-gray-500 text-xs">
                  {status === "ready" && "Click to talk"}
                  {status === "recording" && "Listening... Click to send"}
                  {status === "processing" && "Thinking..."}
                  {status === "playing" && "Speaking... Click to interrupt"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
