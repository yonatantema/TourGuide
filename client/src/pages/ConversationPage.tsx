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

export default function ConversationModal({
  artwork,
  guideId,
  language,
  onClose,
}: ConversationModalProps) {
  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Int16Array[]>([]);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackBufferRef = useRef<Float32Array[]>([]);
  const playbackOffsetRef = useRef(0);
  const statusRef = useRef<ConversationStatus>("idle");
  const transcriptRef = useRef("");
  const transcriptSpeakerRef = useRef<"guide" | "visitor" | null>(null);
  const fullTranscriptRef = useRef("");
  const audioSamplesReceivedRef = useRef(0);
  const audioPlaybackStartRef = useRef(0);
  const textSyncIntervalRef = useRef<number | null>(null);
  const samplesPlayedRef = useRef(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const cleanup = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    playbackProcessorRef.current?.disconnect();
    playbackProcessorRef.current = null;
    playbackCtxRef.current?.close();
    playbackCtxRef.current = null;
    playbackBufferRef.current = [];
    playbackOffsetRef.current = 0;
    audioChunksRef.current = [];
    if (textSyncIntervalRef.current) {
      clearInterval(textSyncIntervalRef.current);
      textSyncIntervalRef.current = null;
    }
  }, []);

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
      samplesPlayedRef.current += written;
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

  const handleStartConversation = async () => {
    setStatus("connecting");

    try {
      // Request mic access immediately so the browser prompts the user
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      const { clientSecret } = await createRealtimeSession(guideId, artwork.id, language);

      const ws = new WebSocket(
        "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
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
          audioSamplesReceivedRef.current += pcm16.length;
          // Start sync interval on first audio chunk of a response
          if (audioPlaybackStartRef.current === 0) {
            audioPlaybackStartRef.current = Date.now();
            setStatus("playing");
            textSyncIntervalRef.current = window.setInterval(() => {
              if (audioSamplesReceivedRef.current > 0 && fullTranscriptRef.current) {
                const ratio = Math.min(samplesPlayedRef.current / audioSamplesReceivedRef.current, 1);
                const charCount = Math.floor(ratio * fullTranscriptRef.current.length);
                if (charCount >= fullTranscriptRef.current.length) {
                  setLastTranscript(fullTranscriptRef.current);
                } else {
                  let endIdx = fullTranscriptRef.current.lastIndexOf(" ", charCount);
                  if (endIdx < 0) endIdx = charCount;
                  setLastTranscript(fullTranscriptRef.current.substring(0, endIdx || 1));
                }
              }
            }, 100);
          }
        }

        if (data.type === "response.audio_transcript.delta") {
          if (transcriptSpeakerRef.current !== "guide") {
            fullTranscriptRef.current = "";
            transcriptSpeakerRef.current = "guide";
          }
          fullTranscriptRef.current += data.delta;
        }

        if (data.type === "conversation.item.input_audio_transcription.completed") {
          transcriptRef.current = data.transcript;
          transcriptSpeakerRef.current = "visitor";
        }

        if (data.type === "response.audio.done") {
          // Only transition to ready if still in playing state
          if (statusRef.current !== "playing") return;
          // Wait for the playback buffer to drain before transitioning
          const checkDrained = setInterval(() => {
            if (playbackBufferRef.current.length === 0) {
              clearInterval(checkDrained);
              // Reveal full transcript and stop sync interval
              if (fullTranscriptRef.current) {
                setLastTranscript(fullTranscriptRef.current);
              }
              if (textSyncIntervalRef.current) {
                clearInterval(textSyncIntervalRef.current);
                textSyncIntervalRef.current = null;
              }
              audioPlaybackStartRef.current = 0;
              audioSamplesReceivedRef.current = 0;
              samplesPlayedRef.current = 0;
              if (statusRef.current === "playing") {
                setStatus("ready");
              }
            }
          }, 100);
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
    } catch (err) {
      console.error("Failed to start conversation:", err);
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

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      audioChunksRef.current = [];
      transcriptRef.current = "";
      fullTranscriptRef.current = "";
      transcriptSpeakerRef.current = null;
      audioSamplesReceivedRef.current = 0;
      audioPlaybackStartRef.current = 0;
      samplesPlayedRef.current = 0;
      if (textSyncIntervalRef.current) {
        clearInterval(textSyncIntervalRef.current);
        textSyncIntervalRef.current = null;
      }
      setLastTranscript(null);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
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
    processorRef.current?.disconnect();
    processorRef.current = null;
    // Keep mic stream alive for reuse — only close AudioContext
    audioContextRef.current?.close();
    audioContextRef.current = null;

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
      // Interrupt AI: cancel server response, stop playback, start recording
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "response.cancel" }));
      }
      stopPlayback();
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

        {/* Last spoken text */}
        {lastTranscript && (
          <div className="flex-shrink-0 px-4 overflow-hidden flex items-end max-h-10">
            <p className="text-sm text-left w-full text-gray-900">
              {lastTranscript}
            </p>
          </div>
        )}

        {/* Idle state — Start button */}
        {status === "idle" && (
          <button
            onClick={handleStartConversation}
            className="flex-shrink-0 px-8 py-3 bg-accent text-white rounded-md text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer"
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
            className="flex-shrink-0 px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors cursor-pointer"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}
