import { useEffect, useRef, useState, useCallback } from "react";
import { Artwork, UPLOADS_URL } from "../services/artworkApi";
import { createRealtimeSession } from "../services/conversationApi";

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

type NavigatorWithAudioSession = Navigator & {
  audioSession?: {
    type?: string;
  };
};

export default function ConversationModal({
  artwork,
  guideId,
  language,
  onClose,
}: ConversationModalProps) {
  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [errorDetail, setErrorDetail] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const [transcriptLog, setTranscriptLog] = useState<{ speaker: "guide" | "visitor"; text: string }[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micMuteGainRef = useRef<GainNode | null>(null);
  const micGraphStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Int16Array[]>([]);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackBufferRef = useRef<Float32Array[]>([]);
  const playbackOffsetRef = useRef(0);
  const statusRef = useRef<ConversationStatus>("idle");
  const currentGuideTextRef = useRef("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const originalAudioSessionTypeRef = useRef<string | null>(null);
  const audioSessionManagedRef = useRef(false);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptLog]);

  useEffect(() => {
    const interval = setInterval(() => {
      const audioSession = (navigator as NavigatorWithAudioSession).audioSession;
      const info = [
        `session: ${audioSession?.type ?? "N/A"}`,
        `status: ${statusRef.current}`,
        `playCtx: ${playbackCtxRef.current ? playbackCtxRef.current.state : "none"}`,
        `recCtx: ${audioContextRef.current ? audioContextRef.current.state : "none"}`,
      ].join(" | ");
      setDebugInfo(info);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const setAudioSessionType = useCallback((type: "play-and-record" | "playback" | "auto") => {
    const audioSession = (navigator as NavigatorWithAudioSession).audioSession;
    if (!audioSession) return;

    if (!audioSessionManagedRef.current && type !== "auto") {
      originalAudioSessionTypeRef.current = audioSession.type ?? null;
      audioSessionManagedRef.current = true;
    }

    audioSession.type = type;

    if (type === "auto") {
      audioSessionManagedRef.current = false;
    }
  }, []);

  const restoreAudioSession = useCallback(() => {
    const audioSession = (navigator as NavigatorWithAudioSession).audioSession;
    if (!audioSessionManagedRef.current) return;

    if (audioSession) {
      audioSession.type = originalAudioSessionTypeRef.current ?? "auto";
    }

    originalAudioSessionTypeRef.current = null;
    audioSessionManagedRef.current = false;
  }, []);

  const cleanup = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    isRecordingRef.current = false;
    processorRef.current?.disconnect();
    processorRef.current = null;
    micSourceRef.current?.disconnect();
    micSourceRef.current = null;
    micMuteGainRef.current?.disconnect();
    micMuteGainRef.current = null;
    micGraphStreamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    playbackProcessorRef.current?.disconnect();
    playbackProcessorRef.current = null;
    playbackCtxRef.current?.close();
    playbackCtxRef.current = null;
    playbackBufferRef.current = [];
    playbackOffsetRef.current = 0;
    audioChunksRef.current = [];
    restoreAudioSession();
  }, [restoreAudioSession]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const ensurePlaybackStream = () => {
    if (playbackCtxRef.current) return;
    const ctx = new AudioContext({ sampleRate: 24000 });
    playbackCtxRef.current = ctx;
    const processor = ctx.createScriptProcessor(2048, 1, 1);
    playbackProcessorRef.current = processor;

    processor.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      let written = 0;
      while (written < output.length && playbackBufferRef.current.length > 0) {
        const chunk = playbackBufferRef.current[0];
        const offset = playbackOffsetRef.current;
        const remaining = chunk.length - offset;
        const needed = output.length - written;
        if (remaining <= needed) {
          output.set(chunk.subarray(offset), written);
          written += remaining;
          playbackBufferRef.current.shift();
          playbackOffsetRef.current = 0;
        } else {
          output.set(chunk.subarray(offset, offset + needed), written);
          written += needed;
          playbackOffsetRef.current = offset + needed;
        }
      }
      for (let i = written; i < output.length; i++) {
        output[i] = 0;
      }
    };

    // Silent input to keep the processor firing
    const silent = ctx.createConstantSource();
    silent.offset.value = 0;
    silent.connect(processor);
    processor.connect(ctx.destination);
    silent.start();
  };

  const enqueueAudio = (float32: Float32Array) => {
    ensurePlaybackStream();
    playbackBufferRef.current.push(float32);
  };

  const stopPlayback = () => {
    playbackProcessorRef.current?.disconnect();
    playbackProcessorRef.current = null;
    playbackCtxRef.current?.close();
    playbackCtxRef.current = null;
    playbackBufferRef.current = [];
    playbackOffsetRef.current = 0;
  };

  const ensureRecordingGraph = async (stream: MediaStream) => {
    let ctx = audioContextRef.current;
    let processor = processorRef.current;
    const streamChanged = micGraphStreamRef.current !== stream;

    if (streamChanged) {
      processorRef.current?.disconnect();
      processorRef.current = null;
      micSourceRef.current?.disconnect();
      micSourceRef.current = null;
      micMuteGainRef.current?.disconnect();
      micMuteGainRef.current = null;
      audioContextRef.current?.close();
      audioContextRef.current = null;
      ctx = null;
      processor = null;
    }

    if (!ctx || !processor || !micSourceRef.current || !micMuteGainRef.current) {
      ctx = new AudioContext();
      audioContextRef.current = ctx;
      micGraphStreamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      micSourceRef.current = source;

      processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const muteGain = ctx.createGain();
      muteGain.gain.value = 0;
      micMuteGainRef.current = muteGain;

      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const resampled = resampleTo24kHz(inputData, ctx!.sampleRate);
        const pcm16 = float32ToPcm16(resampled);
        audioChunksRef.current.push(pcm16);
      };

      source.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(ctx.destination);
    }

    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  };

  const handleStartConversation = async () => {
    setStatus("connecting");

    try {
      const { clientSecret } = await createRealtimeSession(guideId, artwork.id, language);

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
            setAudioSessionType("playback");
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
          // Only transition to ready if still in playing state
          if (statusRef.current !== "playing") return;
          // Wait for the playback buffer to drain before transitioning
          const checkDrained = setInterval(() => {
            if (playbackBufferRef.current.length === 0) {
              clearInterval(checkDrained);
              if (statusRef.current === "playing") {
                setStatus("ready");
                setAudioSessionType("auto");
                stopPlayback();
              }
            }
          }, 100);
        }

        if (data.type === "error") {
          console.error("Realtime API error:", data.error);
          // Ignore cancel errors (harmless, from response.cancel when no active response)
          if (data.error?.code === "response_cancel_not_active") return;
          // Ignore errors while recording — likely from response.cancel
          if (statusRef.current !== "recording") {
            setErrorDetail(`API error: ${JSON.stringify(data.error)}`);
            setStatus("error");
          }
        }
      };

      ws.onerror = (e) => {
        setErrorDetail(`WebSocket error: ${(e as any)?.message || "connection failed"}`);
        setStatus("error");
      };

      ws.onclose = (e) => {
        if (
          statusRef.current !== "idle" &&
          statusRef.current !== "error"
        ) {
          setErrorDetail(`WebSocket closed: code=${e.code} reason="${e.reason}"`);
          setStatus("error");
        }
      };

      wsRef.current = ws;
    } catch (err: any) {
      restoreAudioSession();
      console.error("Failed to start conversation:", err);
      setErrorDetail(`Catch: ${err?.message || String(err)}`);
      setStatus("error");
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

      setAudioSessionType("play-and-record");
      await ensureRecordingGraph(stream);

      audioChunksRef.current = [];
      currentGuideTextRef.current = "";
      isRecordingRef.current = true;
      setStatus("recording");
    } catch (err) {
      console.error("Microphone access failed:", err);
      setStatus("error");
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setAudioSessionType("playback");

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

    // Discard recordings that are too quiet (likely background noise, not speech)
    let sumSquares = 0;
    for (let i = 0; i < combined.length; i++) {
      sumSquares += combined[i] * combined[i];
    }
    const rms = Math.sqrt(sumSquares / combined.length);
    if (rms < 500) {
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

    // Release mic so iOS exits play-and-record mode, unlocking volume
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
  };

  const handleMicClick = () => {
    if (status === "recording") {
      stopRecording();
    } else if (status === "ready" || status === "playing" || status === "processing") {
      // Only cancel if AI is actively responding
      if (status === "playing" || status === "processing") {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "response.cancel" }));
        }
        stopPlayback();
      }
      startRecording();
    }
  };

  const handleEndConversation = () => {
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

        {debugInfo && <p className="text-[10px] text-gray-400 text-center break-all">{debugInfo}</p>}

        {/* Idle state — Start button */}
        {status === "idle" && (
          <button
            onClick={handleStartConversation}
            className="flex-shrink-0 w-full py-3 bg-accent text-white rounded-md text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer"
          >
            Start a Conversation
          </button>
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
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <p className="text-gray-500 text-sm">Something went wrong</p>
            {errorDetail && <p className="text-red-400 text-xs mt-1 break-all">{errorDetail}</p>}
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
