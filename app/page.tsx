"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CapturePhase = "idle" | "recording" | "processing" | "output";

type BloomFragment = {
  color: string;
  label: string;
  x: number;
  y: number;
};

type EncapsulationItem = BloomFragment & {
  tone: string;
};

type BrowserSpeechRecognitionResult = {
  [index: number]: { transcript: string } | undefined;
};

type BrowserSpeechRecognitionEvent = Event & {
  results: {
    length: number;
    [index: number]: BrowserSpeechRecognitionResult;
  };
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

const waveformBarCount = 28;

const quietWaveform = Array.from({ length: waveformBarCount }, (_, index) => {
  const centerFalloff = 1 - Math.abs(index - (waveformBarCount - 1) / 2) / (waveformBarCount / 2);

  return 0.08 + centerFalloff * 0.1;
});

const fallbackTranscriptWords =
  "this thought is leaving working memory and becoming something the system can safely hold until I need it again".split(
    " ",
  );

const bloomFragments: BloomFragment[] = [
  { color: "#66d9ff", label: "intent", x: 0, y: -118 },
  { color: "#b084ff", label: "evidence", x: 112, y: -42 },
  { color: "#ff7ad9", label: "risk", x: 78, y: 102 },
  { color: "#7effd4", label: "next", x: -86, y: 96 },
  { color: "#f7d774", label: "context", x: -120, y: -36 },
];

const encapsulationItems: EncapsulationItem[] = [
  { color: "#66d9ff", label: "Core Intent", tone: "blue", x: -150, y: -58 },
  { color: "#ff7ad9", label: "Actions", tone: "magenta", x: -50, y: 58 },
  { color: "#b084ff", label: "Strategy", tone: "violet", x: 58, y: -44 },
  { color: "#7effd4", label: "Memory", tone: "mint", x: 154, y: 54 },
];

const outputGridVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      delayChildren: 0.56,
      staggerChildren: 0.11,
    },
  },
};

const bentoCardVariants: Variants = {
  hidden: {
    filter: "saturate(1.35) blur(2px)",
    opacity: 0,
    scale: 1.08,
    y: -52,
  },
  show: {
    filter: "saturate(0.68) blur(0px)",
    opacity: 1,
    scale: 1,
    transition: {
      damping: 16,
      mass: 0.8,
      stiffness: 150,
      type: "spring",
    },
    y: 0,
  },
};

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

function speechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  const speechWindow = window as typeof window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export default function Home() {
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformLevels, setWaveformLevels] = useState(quietWaveform);
  const [transcriptWords, setTranscriptWords] = useState<string[]>([]);
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
  const transcriptTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
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
    setWaveformLevels(quietWaveform);

    if (context && context.state !== "closed") {
      void context.close();
    }
  }, []);

  const stopTranscriptStream = useCallback(() => {
    if (transcriptTimerRef.current) {
      clearInterval(transcriptTimerRef.current);
      transcriptTimerRef.current = null;
    }

    const recognition = recognitionRef.current;
    recognitionRef.current = null;

    if (recognition) {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;

      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          // Some engines throw if recognition is already inactive.
        }
      }
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
    }, 3600);
  }, [clearProcessingTimer]);

  const startFallbackTranscriptStream = useCallback(() => {
    let cursor = 0;

    transcriptTimerRef.current = setInterval(() => {
      setTranscriptWords((currentWords) => {
        const nextWord = fallbackTranscriptWords[cursor % fallbackTranscriptWords.length];

        cursor += 1;
        return [...currentWords, nextWord].slice(-34);
      });
    }, 210);
  }, []);

  const startTranscriptStream = useCallback(() => {
    stopTranscriptStream();
    setTranscriptWords([]);

    const RecognitionConstructor = speechRecognitionConstructor();

    if (!RecognitionConstructor) {
      startFallbackTranscriptStream();
      return;
    }

    try {
      const recognition = new RecognitionConstructor();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (event) => {
        const transcript = Array.from({ length: event.results.length }, (_, index) => {
          return event.results[index]?.[0]?.transcript ?? "";
        }).join(" ");
        const words = transcript.trim().split(/\s+/).filter(Boolean);

        if (words.length > 0) {
          setTranscriptWords(words.slice(-34));
        }
      };
      recognition.onerror = () => {
        if (recognitionRef.current !== recognition) {
          return;
        }

        recognitionRef.current = null;
        startFallbackTranscriptStream();
      };
      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      recognitionRef.current = null;
      startFallbackTranscriptStream();
    }
  }, [startFallbackTranscriptStream, stopTranscriptStream]);

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
        setWaveformLevels(
          Array.from({ length: waveformBarCount }, (_, index) => {
            const sampleIndex = Math.floor((index / waveformBarCount) * frequencyData.length);
            const normalized = frequencyData[sampleIndex] / 255;

            return Math.max(0.08, Math.min(1, normalized * 1.35));
          }),
        );
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
      setTranscriptWords([]);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError("The recording session was interrupted. Please try again.");
        stopElapsedTimer();
        stopMeter();
        stopTranscriptStream();
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
      startTranscriptStream();

      elapsedTimerRef.current = setInterval(() => {
        const startedAt = recordingStartedAtRef.current;
        if (startedAt) {
          setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
        }
      }, 250);
    } catch (captureError) {
      stopElapsedTimer();
      stopMeter();
      stopTranscriptStream();
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
    startTranscriptStream,
    stopElapsedTimer,
    stopMeter,
    stopTranscriptStream,
    stopStreamTracks,
  ]);

  const stopRecording = useCallback(() => {
    if (phase !== "recording") {
      return;
    }

    setPhase("processing");
    stopElapsedTimer();
    stopMeter();
    stopTranscriptStream();

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }

    stopStreamTracks();
    beginProcessing();
  }, [beginProcessing, phase, stopElapsedTimer, stopMeter, stopStreamTracks, stopTranscriptStream]);

  const reset = useCallback(() => {
    clearProcessingTimer();
    stopElapsedTimer();
    stopMeter();
    stopTranscriptStream();
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
    setTranscriptWords([]);
    setPhase("idle");
  }, [clearProcessingTimer, stopElapsedTimer, stopMeter, stopStreamTracks, stopTranscriptStream]);

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
      stopTranscriptStream();
      stopStreamTracks();
    };
  }, [clearProcessingTimer, stopElapsedTimer, stopMeter, stopStreamTracks, stopTranscriptStream]);

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
            transcriptWords={transcriptWords}
            waveformLevels={waveformLevels}
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
  transcriptWords,
  waveformLevels,
}: {
  audioLevel: number;
  elapsedSeconds: number;
  error: string;
  isRecording: boolean;
  onPress: () => void;
  recordButtonLabel: string;
  transcriptWords: string[];
  waveformLevels: number[];
}) {
  return (
    <motion.section
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="relative z-10 flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center"
      exit={{ opacity: 0, scale: 0.96, y: -12, transition: { duration: 0.22 } }}
      initial={{ opacity: 0, scale: 0.98, y: 18 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassSphere audioLevel={audioLevel} isRecording={isRecording} />

      <div className="mt-9 flex min-h-20 flex-col items-center gap-3 text-center">
        {isRecording ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-[min(36rem,calc(100vw-2.5rem))] flex-col items-center gap-5"
            initial={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            <WaveformVisualizer levels={waveformLevels} />
            <LiveTranscript words={transcriptWords} />
          </motion.div>
        ) : null}

        <motion.p
          animate={{ opacity: isRecording ? 0.64 : [0.64, 1, 0.64] }}
          className="text-[0.64rem] font-semibold uppercase tracking-[0.5em] text-[#888888]"
          transition={{ duration: 2.8, ease: "easeInOut", repeat: isRecording ? 0 : Infinity }}
        >
          {isRecording ? `Live Signal ${formatElapsed(elapsedSeconds)}` : "No decisions yet"}
        </motion.p>
        <motion.button
          aria-label={recordButtonLabel}
          className="rounded-full border border-white/12 bg-white px-5 py-3 text-[0.62rem] font-black uppercase tracking-[0.34em] text-black shadow-[0_0_44px_rgba(255,255,255,0.12)] transition hover:border-white hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          onClick={onPress}
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
        >
          {isRecording ? "Seal Thought" : "Speak Thought"}
        </motion.button>
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

function GlassSphere({
  audioLevel,
  isRecording,
}: {
  audioLevel: number;
  isRecording: boolean;
}) {
  return (
    <div className="relative flex h-52 w-52 items-center justify-center sm:h-64 sm:w-64">
      <motion.div
        animate={
          isRecording
            ? {
                borderRadius: ["48% 52% 45% 55%", "56% 44% 52% 48%", "46% 54% 58% 42%"],
                scale: 1 + audioLevel * 0.32,
              }
            : {
                borderRadius: ["50% 50% 50% 50%", "47% 53% 51% 49%", "52% 48% 47% 53%"],
                scale: [1, 1.026, 0.994, 1.012],
              }
        }
        className="relative h-44 w-44 overflow-hidden border border-white/10 bg-[#0b0b0b] shadow-[0_0_110px_rgba(255,255,255,0.11),inset_0_0_80px_rgba(255,255,255,0.04)] sm:h-56 sm:w-56"
        transition={
          isRecording
            ? {
                borderRadius: { duration: 1.2, ease: "easeInOut", repeat: Infinity },
                scale: { damping: 16, mass: 0.5, stiffness: 360, type: "spring" },
              }
            : { duration: 6, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }
        }
      >
        <motion.div
          animate={{
            opacity: isRecording ? [0.68, 1, 0.74] : [0.42, 0.7, 0.46],
            rotate: isRecording ? [0, 18, -12, 0] : [0, 8, -6, 0],
            scale: isRecording ? [1, 1.14 + audioLevel * 0.2, 0.96] : [1, 1.05, 0.98],
          }}
          className="absolute inset-0 bg-[conic-gradient(from_90deg_at_50%_50%,#000000,#202020,#7d7d7d,#111111,#000000,#4a4a4a,#000000)]"
          transition={{ duration: isRecording ? 1.1 : 8, ease: "easeInOut", repeat: Infinity }}
        />
        <motion.div
          animate={{
            opacity: isRecording ? [0.48, 0.82, 0.36] : [0.34, 0.62, 0.38],
            x: isRecording ? [-8, 10, -4] : [-5, 6, -2],
            y: isRecording ? [6, -10, 3] : [4, -6, 2],
          }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.58),transparent_21%),radial-gradient(circle_at_70%_72%,rgba(125,125,125,0.48),transparent_25%),radial-gradient(circle_at_45%_55%,#0b0b0b,transparent_58%)] mix-blend-screen"
          transition={{ duration: isRecording ? 0.85 : 6.2, ease: "easeInOut", repeat: Infinity }}
        />
        <div className="absolute inset-[1px] rounded-[inherit] border border-white/10 bg-black/20 shadow-[inset_0_0_48px_rgba(0,0,0,0.76)]" />
        <div className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_28%,rgba(255,255,255,0.05)_62%,transparent)] opacity-70" />
      </motion.div>

      {isRecording ? (
        <motion.div
          animate={{ opacity: [0.32, 0], scale: [1, 1.46 + audioLevel * 0.24] }}
          className="absolute h-48 w-48 rounded-full border border-white/25 sm:h-60 sm:w-60"
          transition={{ duration: 0.9, ease: "easeOut", repeat: Infinity }}
        />
      ) : null}
    </div>
  );
}

function WaveformVisualizer({ levels }: { levels: number[] }) {
  return (
    <div
      aria-label="Reactive voice waveform"
      className="flex h-20 w-full items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-5 shadow-[inset_0_0_48px_rgba(255,255,255,0.025)]"
      role="img"
    >
      {levels.map((level, index) => (
        <motion.span
          animate={{
            height: 8 + level * 56,
            opacity: 0.28 + level * 0.58,
          }}
          className="w-1 rounded-full bg-white"
          key={`${index}-${waveformBarCount}`}
          transition={{ damping: 18, mass: 0.7, stiffness: 260, type: "spring" }}
        />
      ))}
    </div>
  );
}

function LiveTranscript({ words }: { words: string[] }) {
  const visibleWords = words.length > 0 ? words : ["listening"];

  return (
    <div className="min-h-24 w-full max-w-xl text-center text-lg leading-8 text-white/78 sm:text-xl sm:leading-9">
      <AnimatePresence initial={false}>
        {visibleWords.map((word, index) => (
          <motion.span
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            className="mr-1.5 inline-block"
            exit={{ opacity: 0 }}
            initial={{ filter: "blur(8px)", opacity: 0, y: 8 }}
            key={`${word}-${index}`}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
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
      <div className="relative flex h-[22rem] w-[22rem] items-center justify-center sm:h-[28rem] sm:w-[28rem]">
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full overflow-visible"
          viewBox="-180 -180 360 360"
        >
          {bloomFragments.map((fragment, index) => (
            <motion.path
              animate={{ opacity: 0.58, pathLength: 1 }}
              d={`M 0 0 Q ${fragment.x * 0.35} ${fragment.y * 0.35} ${fragment.x} ${
                fragment.y
              }`}
              initial={{ opacity: 0.22, pathLength: 0.38 }}
              key={fragment.label}
              stroke={fragment.color}
              strokeLinecap="round"
              strokeWidth="1.2"
              transition={{
                delay: 0.16 + index * 0.1,
                duration: 0.72,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          ))}
        </svg>

        <motion.div
          animate={{
            background: ["#111111", "#1c1c1c", "#080808"],
            borderRadius: ["44% 56% 52% 48%", "50% 50% 50% 50%", "46% 54% 48% 52%"],
            boxShadow: [
              "0 0 92px rgba(136,136,136,0.16), inset 0 0 64px rgba(0,0,0,0.75)",
              "0 0 60px rgba(255,255,255,0.22), inset 0 0 22px rgba(255,255,255,0.18)",
              "0 0 42px rgba(255,255,255,0.28), 0 0 120px rgba(176,132,255,0.12)",
            ],
            filter: "blur(0px)",
            height: [190, 132, 86],
            opacity: [1, 0.84, 0.42],
            rotate: [0, 16, -6],
            width: [190, 132, 86],
          }}
          className="absolute border border-white/15"
          initial={{
            background: "#111111",
            filter: "blur(14px)",
            height: 190,
            width: 190,
          }}
          transition={{
            background: { duration: 1.3, ease: [0.16, 1, 0.3, 1] },
            borderRadius: { duration: 1.4, ease: [0.16, 1, 0.3, 1] },
            boxShadow: { duration: 1.4, ease: [0.16, 1, 0.3, 1] },
            default: { duration: 1.45, ease: [0.16, 1, 0.3, 1] },
            filter: { duration: 0.4 },
          }}
        />

        {bloomFragments.map((fragment, index) => (
          <motion.div
            animate={{
              filter: "blur(0px)",
              opacity: 1,
              scale: 1,
              x: fragment.x,
              y: fragment.y,
            }}
            className="absolute flex h-20 w-20 items-center justify-center rounded-[1.35rem] border bg-black/72 text-[0.54rem] font-black uppercase tracking-[0.26em] text-white shadow-[0_0_48px_rgba(255,255,255,0.07)] backdrop-blur-md"
            initial={{ filter: "blur(9px)", opacity: 0, scale: 0.42, x: 0, y: 0 }}
            key={fragment.label}
            style={{
              borderColor: `${fragment.color}55`,
              boxShadow: `0 0 34px ${fragment.color}22, inset 0 0 28px ${fragment.color}14`,
              color: fragment.color,
            }}
            transition={{
              damping: 17,
              delay: 0.2 + index * 0.12,
              mass: 0.8,
              stiffness: 145,
              type: "spring",
            }}
          >
            {fragment.label}
          </motion.div>
        ))}

        <motion.div
          animate={{ opacity: [0, 0.32, 0], scale: [0.7, 1.8, 2.4] }}
          className="absolute h-5 w-5 rounded-full border border-white/50"
          transition={{ delay: 0.7, duration: 1.3, ease: "easeOut", repeat: Infinity }}
        />
      </div>
      <motion.p
        animate={{ opacity: [0.36, 1, 0.36] }}
        className="-mt-6 text-[0.64rem] font-semibold uppercase tracking-[0.52em] text-[#888888]"
        transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
      >
        Revealing Structure
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

      <EncapsulationStage />

      <motion.div
        animate="show"
        className="grid grid-cols-1 gap-3 lg:grid-cols-12"
        initial="hidden"
        variants={outputGridVariants}
      >
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
      </motion.div>

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

function EncapsulationStage() {
  return (
    <div
      aria-label="Thought fragments settling into memory containers"
      className="relative mx-auto mb-8 h-56 w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.075),transparent_17rem)]"
      role="img"
    >
      <motion.div
        animate={{ opacity: [0.68, 0.36, 0], scale: [1, 0.76, 0.42] }}
        className="absolute left-1/2 top-1/2 h-24 w-36 rounded-[1.35rem] border border-white/16 bg-white/[0.055] shadow-[0_0_70px_rgba(255,255,255,0.08)]"
        initial={{ opacity: 0.68, scale: 1 }}
        style={{ marginLeft: -72, marginTop: -48 }}
        transition={{ duration: 1.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-3 rounded-[1rem] border border-white/10" />
      </motion.div>

      {encapsulationItems.map((item, index) => (
        <motion.div
          animate={{ scale: [1, 1.022, 1], y: [0, -1.5, 0] }}
          className="absolute h-16 w-20"
          key={item.label}
          style={{
            left: `calc(50% + ${item.x}px)`,
            marginLeft: -40,
            marginTop: -32,
            top: `calc(50% + ${item.y}px)`,
          }}
          transition={{
            delay: index * 0.2,
            duration: 4.8 + index * 0.3,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        >
          {[0, 1, 2].map((stackIndex) => (
            <div
              className="absolute h-10 w-16 rounded-xl border bg-black/78 backdrop-blur-md"
              key={`${item.label}-${stackIndex}`}
              style={{
                borderColor: `${item.color}${stackIndex === 0 ? "55" : "30"}`,
                bottom: stackIndex * 7,
                boxShadow: `0 0 22px ${item.color}16`,
                filter: "saturate(0.58)",
                left: 8 - stackIndex * 2,
              }}
            />
          ))}
          <span
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[0.48rem] font-black uppercase tracking-[0.24em] text-white/38"
            style={{ color: `${item.color}99` }}
          >
            {item.tone}
          </span>
        </motion.div>
      ))}

      {encapsulationItems.map((item, index) => (
        <LandingShard item={item} key={`landing-${item.label}`} onLand={playClosureFeedback} order={index} />
      ))}
    </div>
  );
}

function LandingShard({
  item,
  onLand,
  order,
}: {
  item: EncapsulationItem;
  onLand: () => void;
  order: number;
}) {
  const hasLandedRef = useRef(false);

  return (
    <motion.div
      animate={{
        filter: "saturate(0.56) blur(0.6px)",
        opacity: [0, 1, 1],
        scale: 0.38,
        x: item.x,
        y: item.y,
      }}
      className="absolute left-1/2 top-1/2 flex h-20 w-32 items-center justify-center rounded-2xl border bg-black/82 text-center text-[0.54rem] font-black uppercase tracking-[0.22em] text-white backdrop-blur-md"
      initial={{
        filter: "saturate(1.35) blur(0px)",
        opacity: 0,
        scale: 1,
        x: 0,
        y: 0,
      }}
      onAnimationComplete={() => {
        if (hasLandedRef.current) {
          return;
        }

        hasLandedRef.current = true;
        onLand();
      }}
      style={{
        borderColor: `${item.color}66`,
        boxShadow: `0 0 42px ${item.color}2b, inset 0 0 28px ${item.color}14`,
        color: item.color,
        marginLeft: -64,
        marginTop: -40,
      }}
      transition={{
        damping: 16,
        delay: order * 0.1,
        mass: 0.8,
        stiffness: 150,
        type: "spring",
      }}
    >
      {item.label}
    </motion.div>
  );
}

function playClosureFeedback() {
  if (typeof window === "undefined") {
    return;
  }

  const feedbackNavigator = navigator as Navigator & {
    vibrate?: (pattern: number | number[]) => boolean;
  };

  feedbackNavigator.vibrate?.(8);

  try {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) {
      return;
    }

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(132, now);
    oscillator.frequency.exponentialRampToValueAtTime(96, now + 0.14);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(420, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.032, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.16);
    oscillator.onended = () => {
      void context.close();
    };
  } catch {
    // Browsers may block non-gesture audio; the visual and haptic cues still carry closure.
  }
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
      variants={bentoCardVariants}
    >
      <motion.div
        animate={{ opacity: [0.22, 0.34, 0.22], scale: [1, 1.018, 1] }}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_20rem)]"
        transition={{ duration: 5.4, ease: "easeInOut", repeat: Infinity }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/20 opacity-0 transition group-hover:opacity-100" />
      <p className="relative mb-5 text-[0.6rem] font-semibold uppercase tracking-[0.42em] text-[#888888]">
        {label}
      </p>
      <div className="relative">{children}</div>
    </motion.article>
  );
}
