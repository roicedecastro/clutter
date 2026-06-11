"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CapturePhase = "idle" | "recording" | "processing" | "output";

const actionItems = [
  "Ship the invite-only founder interview loop before adding model automation.",
  "Turn every raw voice dump into one investor-grade thesis and three asks.",
  "Instrument retention around reviewed memories, not transcription volume.",
  "Reserve Friday deep work for pruning the research graph into decisions.",
];

const strategyNotes =
  "The wedge is not another notes app. It is a cognitive lockbox for volatile insight: founders speak while the signal is still emotionally charged, then the system crystallizes intent, evidence, and next moves before context decay begins. The initial audience should be operators who already pay a high tax for fragmented thinking: solo founders, principal researchers, and high-agency PMs running ambiguous bets. The premium moment is when a messy, vulnerable voice memo returns as something sharper than the speaker could have written under pressure.";

function preferredAudioMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.max(0, seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function Home() {
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [capturedDuration, setCapturedDuration] = useState(0);
  const [capturedAt, setCapturedAt] = useState("");
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterFrameRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);

  const isIntake = phase === "idle" || phase === "recording";

  const displayedElapsed = phase === "recording" ? elapsedSeconds : capturedDuration;
  const recordButtonLabel = phase === "recording" ? "Stop and process recording" : "Tap to start recording";

  const stopElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  const stopMeter = useCallback(() => {
    if (meterFrameRef.current) {
      cancelAnimationFrame(meterFrameRef.current);
      meterFrameRef.current = null;
    }

    const context = audioContextRef.current;
    audioContextRef.current = null;
    setAudioLevel(0);

    if (context && context.state !== "closed") {
      void context.close();
    }
  }, []);

  const stopStreamTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = null;
  }, []);

  const clearProcessingTimer = useCallback(() => {
    if (processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
  }, []);

  const beginProcessing = useCallback(() => {
    clearProcessingTimer();
    setPhase("processing");

    processingTimerRef.current = setTimeout(() => {
      setPhase("output");
      processingTimerRef.current = null;
    }, 3000);
  }, [clearProcessingTimer]);

  const startMeter = useCallback(
    (stream: MediaStream) => {
      const AudioContextConstructor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextConstructor) {
        return;
      }

      const context = new AudioContextConstructor();
      const analyser = context.createAnalyser();
      const source = context.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.68;
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      audioContextRef.current = context;

      const tick = () => {
        analyser.getByteFrequencyData(frequencyData);

        const average =
          frequencyData.reduce((total, value) => total + value, 0) / frequencyData.length;

        setAudioLevel(Math.min(1, average / 150));
        meterFrameRef.current = requestAnimationFrame(tick);
      };

      tick();
    },
    [],
  );

  const startRecording = useCallback(async () => {
    setError("");
    clearProcessingTimer();

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone capture is not available in this browser.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setError("MediaRecorder is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const mimeType = preferredAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setCapturedDuration(0);
      setCapturedAt(
        new Intl.DateTimeFormat("en", {
          hour: "2-digit",
          minute: "2-digit",
          month: "short",
          day: "2-digit",
        }).format(new Date()),
      );
      setAudioBlob(null);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError("The recording session was interrupted. Please try again.");
        stopElapsedTimer();
        stopMeter();
        stopStreamTracks();
        setPhase("idle");
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        const startedAt = recordingStartedAtRef.current;
        const duration = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 0;

        recorderRef.current = null;
        recordingStartedAtRef.current = null;
        chunksRef.current = [];
        setCapturedDuration(duration);
        setAudioBlob(blob);
        stopStreamTracks();
        beginProcessing();
      };

      recorder.start(250);
      setPhase("recording");
      startMeter(stream);

      elapsedTimerRef.current = setInterval(() => {
        const startedAt = recordingStartedAtRef.current;
        if (startedAt) {
          setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
        }
      }, 250);
    } catch (captureError) {
      stopElapsedTimer();
      stopMeter();
      stopStreamTracks();
      setPhase("idle");
      setError(
        captureError instanceof DOMException && captureError.name === "NotAllowedError"
          ? "Microphone permission is required to capture a thought."
          : "Unable to start the microphone. Check input permissions and try again.",
      );
    }
  }, [
    beginProcessing,
    clearProcessingTimer,
    startMeter,
    stopElapsedTimer,
    stopMeter,
    stopStreamTracks,
  ]);

  const stopRecording = useCallback(() => {
    if (phase !== "recording") {
      return;
    }

    setPhase("processing");
    stopElapsedTimer();
    stopMeter();

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }

    stopStreamTracks();
    beginProcessing();
  }, [beginProcessing, phase, stopElapsedTimer, stopMeter, stopStreamTracks]);

  const reset = useCallback(() => {
    clearProcessingTimer();
    stopElapsedTimer();
    stopMeter();
    stopStreamTracks();

    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }

    recorderRef.current = null;
    chunksRef.current = [];
    recordingStartedAtRef.current = null;
    setAudioBlob(null);
    setCapturedDuration(0);
    setCapturedAt("");
    setElapsedSeconds(0);
    setError("");
    setPhase("idle");
  }, [clearProcessingTimer, stopElapsedTimer, stopMeter, stopStreamTracks]);

  useEffect(() => {
    if (!audioBlob) {
      setAudioUrl(null);
      return;
    }

    const nextAudioUrl = URL.createObjectURL(audioBlob);
    setAudioUrl(nextAudioUrl);

    return () => {
      URL.revokeObjectURL(nextAudioUrl);
    };
  }, [audioBlob]);

  useEffect(() => {
    return () => {
      clearProcessingTimer();
      stopElapsedTimer();
      stopMeter();
      stopStreamTracks();
    };
  }, [clearProcessingTimer, stopElapsedTimer, stopMeter, stopStreamTracks]);

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-black px-5 py-8 text-white sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.055),transparent_23rem)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

      <AnimatePresence mode="wait">
        {isIntake ? (
          <IntakePhase
            key="intake"
            audioLevel={audioLevel}
            elapsedSeconds={displayedElapsed}
            error={error}
            isRecording={phase === "recording"}
            onPress={phase === "recording" ? stopRecording : startRecording}
            recordButtonLabel={recordButtonLabel}
          />
        ) : null}

        {phase === "processing" ? <ProcessingPhase key="processing" /> : null}

        {phase === "output" ? (
          <OutputPhase
            key="output"
            audioUrl={audioUrl}
            capturedAt={capturedAt}
            duration={capturedDuration}
            onReset={reset}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function IntakePhase({
  audioLevel,
  elapsedSeconds,
  error,
  isRecording,
  onPress,
  recordButtonLabel,
}: {
  audioLevel: number;
  elapsedSeconds: number;
  error: string;
  isRecording: boolean;
  onPress: () => void;
  recordButtonLabel: string;
}) {
  const recordingScale = 1 + audioLevel * 0.52;

  return (
    <motion.section
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="relative z-10 flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center"
      exit={{ opacity: 0, scale: 0.96, y: -12, transition: { duration: 0.22 } }}
      initial={{ opacity: 0, scale: 0.98, y: 18 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.button
        aria-label={recordButtonLabel}
        animate={
          isRecording
            ? {
                borderRadius: ["48% 52% 45% 55%", "56% 44% 52% 48%", "46% 54% 58% 42%"],
                scale: recordingScale,
              }
            : {
                borderRadius: ["48% 52% 45% 55%", "42% 58% 54% 46%", "58% 42% 48% 52%"],
                scale: [1, 1.055, 0.985, 1.025],
              }
        }
        className="group relative h-44 w-44 cursor-pointer overflow-hidden border border-white/10 bg-[#111111] shadow-[0_0_90px_rgba(255,255,255,0.12)] outline-none transition hover:border-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:h-56 sm:w-56"
        onClick={onPress}
        transition={
          isRecording
            ? {
                borderRadius: {
                  duration: 1.1,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "mirror",
                },
                scale: {
                  damping: 16,
                  mass: 0.5,
                  stiffness: 420,
                  type: "spring",
                },
              }
            : {
                duration: 7,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "mirror",
              }
        }
        type="button"
        whileHover={{ filter: "brightness(1.16)", y: -3 }}
        whileTap={{ scale: isRecording ? recordingScale * 0.94 : 0.94 }}
      >
        <motion.div
          animate={{
            opacity: isRecording ? [0.65, 1, 0.72] : [0.54, 0.88, 0.62],
            rotate: isRecording ? [0, 28, -18, 0] : [0, 10, -8, 0],
            scale: isRecording ? [1, 1.18 + audioLevel * 0.22, 0.92] : [1, 1.08, 0.96],
          }}
          className="absolute inset-0 bg-[conic-gradient(from_90deg_at_50%_50%,#000000,#222222,#888888,#111111,#000000,#444444,#000000)]"
          transition={{ duration: isRecording ? 1.05 : 8, ease: "easeInOut", repeat: Infinity }}
        />
        <motion.div
          animate={{
            opacity: isRecording ? [0.42, 0.82, 0.32] : [0.38, 0.72, 0.48],
            x: isRecording ? [-10, 12, -4] : [-6, 8, -3],
            y: isRecording ? [8, -12, 4] : [5, -8, 2],
          }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.58),transparent_21%),radial-gradient(circle_at_68%_70%,rgba(136,136,136,0.45),transparent_26%),radial-gradient(circle_at_45%_55%,#111111,transparent_58%)] mix-blend-screen"
          transition={{ duration: isRecording ? 0.8 : 6.4, ease: "easeInOut", repeat: Infinity }}
        />
        <div className="absolute inset-[1px] rounded-[inherit] border border-white/10 bg-black/20 shadow-[inset_0_0_44px_rgba(0,0,0,0.72)]" />
        {isRecording ? (
          <motion.div
            animate={{ opacity: [0.45, 0], scale: [1, 1.42 + audioLevel * 0.38] }}
            className="absolute inset-[-18px] rounded-[inherit] border border-white/30"
            transition={{ duration: 0.82, ease: "easeOut", repeat: Infinity }}
          />
        ) : null}
        <div className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_28%,rgba(255,255,255,0.06)_62%,transparent)] opacity-70 transition group-hover:opacity-100" />
      </motion.button>

      <div className="mt-8 flex min-h-20 flex-col items-center gap-3 text-center">
        <motion.p
          animate={{ opacity: isRecording ? 1 : [0.72, 1, 0.72] }}
          className="text-[0.68rem] font-semibold uppercase tracking-[0.48em] text-white"
          transition={{ duration: 2.8, ease: "easeInOut", repeat: isRecording ? 0 : Infinity }}
        >
          {isRecording ? "Tap to Lock In" : "Tap to Record"}
        </motion.p>
        <p className="font-mono text-xs tracking-[0.28em] text-[#888888]">
          {isRecording ? `LIVE SIGNAL ${formatElapsed(elapsedSeconds)}` : "VOICE INTO STRUCTURE"}
        </p>
        {error ? (
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xs text-sm leading-6 text-[#888888]"
            initial={{ opacity: 0, y: 8 }}
          >
            {error}
          </motion.p>
        ) : null}
      </div>
    </motion.section>
  );
}

function ProcessingPhase() {
  return (
    <motion.section
      animate={{ opacity: 1 }}
      className="relative z-10 flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center"
      exit={{ opacity: 0, filter: "blur(10px)", transition: { duration: 0.22 } }}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative flex h-64 w-64 items-center justify-center">
        <motion.div
          animate={{
            background: ["#222222", "#888888", "#ffffff"],
            borderRadius: ["44% 56% 52% 48%", "50% 50% 50% 50%", "999px"],
            boxShadow: [
              "0 0 92px rgba(136,136,136,0.16), inset 0 0 64px rgba(0,0,0,0.75)",
              "0 0 44px rgba(255,255,255,0.32), inset 0 0 18px rgba(255,255,255,0.18)",
              "0 0 34px rgba(255,255,255,0.9), 0 0 120px rgba(255,255,255,0.16)",
            ],
            filter: "blur(0px)",
            height: [214, 54, 10],
            opacity: [1, 1, 1],
            rotate: [0, 38, 0],
            width: [214, 54, 10],
          }}
          className="absolute border border-white/15"
          initial={{
            background: "#111111",
            filter: "blur(14px)",
            height: 214,
            width: 214,
          }}
          transition={{
            background: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
            borderRadius: { duration: 0.44, ease: [0.16, 1, 0.3, 1] },
            boxShadow: { duration: 0.58, ease: [0.16, 1, 0.3, 1] },
            default: { duration: 0.62, ease: [0.16, 1, 0.3, 1] },
            filter: { duration: 0.4 },
          }}
        />
        <motion.div
          animate={{ opacity: [0, 0.35, 0], scale: [0.7, 1.9, 2.6] }}
          className="absolute h-5 w-5 rounded-full border border-white/50"
          transition={{ delay: 0.42, duration: 1.1, ease: "easeOut", repeat: Infinity }}
        />
      </div>
      <motion.p
        animate={{ opacity: [0.36, 1, 0.36] }}
        className="-mt-6 text-[0.64rem] font-semibold uppercase tracking-[0.52em] text-[#888888]"
        transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
      >
        Condensing Signal
      </motion.p>
    </motion.section>
  );
}

function OutputPhase({
  audioUrl,
  capturedAt,
  duration,
  onReset,
}: {
  audioUrl: string | null;
  capturedAt: string;
  duration: number;
  onReset: () => void;
}) {
  const cards = useMemo(
    () => ({
      context:
        "Voice memo crystallized into operating memory. No API call has been made yet; this is the intended structural output layer.",
      thesis:
        "Build the founder's second brain around decisive memory: capture raw conviction at the speed of speech, then return it as strategy before doubt edits it away.",
    }),
    [],
  );

  return (
    <motion.section
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-center"
      exit={{ opacity: 0, y: 18, filter: "blur(12px)", transition: { duration: 0.18 } }}
      initial={{ opacity: 0, y: 28, filter: "blur(12px)" }}
      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.5em] text-[#888888]">
            Brain Dump / Structured Memory
          </p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#888888]">{cards.context}</p>
        </div>
        <div className="hidden h-px flex-1 bg-white/10 sm:block" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <BentoCard className="lg:col-span-12" label="01 / Core Intent">
          <h1 className="max-w-5xl text-balance text-3xl font-black leading-[0.95] tracking-[-0.055em] text-white sm:text-5xl lg:text-7xl">
            {cards.thesis}
          </h1>
        </BentoCard>

        <BentoCard className="lg:col-span-5" label="02 / Execution">
          <div className="space-y-4">
            {actionItems.map((item) => (
              <div className="flex items-start gap-3" key={item}>
                <span className="mt-1.5 h-3.5 w-3.5 shrink-0 border border-white/35 bg-black shadow-[inset_0_0_0_2px_#000000]" />
                <p className="text-sm leading-6 text-white/90">{item}</p>
              </div>
            ))}
          </div>
        </BentoCard>

        <BentoCard className="lg:col-span-7" label="03 / Context & Deep Strategy">
          <p className="text-base leading-8 text-white/80 sm:text-lg">{strategyNotes}</p>
        </BentoCard>

        <BentoCard className="lg:col-span-12" label="04 / Metadata & Audio">
          <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-[#888888]">
              <span>{capturedAt || "Just now"}</span>
              <span className="h-1 w-1 rounded-full bg-white/35" />
              <span>{formatElapsed(duration)}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-white/45">
                [Core Memory]
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111111]/70 p-2">
              {audioUrl ? (
                <audio className="h-11 w-full invert" controls preload="metadata" src={audioUrl}>
                  Your browser does not support the audio element.
                </audio>
              ) : (
                <p className="px-3 py-2 text-sm text-[#888888]">
                  Audio preview is preparing from the captured blob.
                </p>
              )}
            </div>
          </div>
        </BentoCard>
      </div>

      <div className="mt-7 flex justify-center">
        <motion.button
          className="border border-white/10 px-4 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.38em] text-[#888888] transition hover:border-white/30 hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          onClick={onReset}
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
        >
          Reset / Dump Another Thought
        </motion.button>
      </div>
    </motion.section>
  );
}

function BentoCard({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <motion.article
      className={`group relative overflow-hidden border border-white/10 bg-[#050505] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition duration-300 hover:border-white/20 hover:bg-[#080808] sm:p-7 ${className}`}
      initial={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/20 opacity-0 transition group-hover:opacity-100" />
      <p className="mb-5 text-[0.6rem] font-semibold uppercase tracking-[0.42em] text-[#888888]">
        {label}
      </p>
      {children}
    </motion.article>
  );
}
