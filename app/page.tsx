"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type DemoPhase = "ambient" | "capture" | "bloom" | "encapsulated";
type StackId = "Physical" | "Emotional" | "Mental" | "Spiritual";

type DemoCard = {
  id: string;
  label: string;
  stack: StackId;
  tags: string[];
  tint: string;
  x: number;
  y: number;
};

const demoText =
  "need to follow up with the contractor about the kitchen, also don't forget mom's birthday is next week, and I had that idea about the side project - something with local plants and a subscription box";

const demoWords = demoText.split(" ");

const demoCards: DemoCard[] = [
  {
    id: "contractor",
    label: "Follow up: contractor / kitchen",
    stack: "Physical",
    tags: ["errand", "home", "soon"],
    tint: "var(--sage)",
    x: -250,
    y: -96,
  },
  {
    id: "birthday",
    label: "Mom's birthday - next week",
    stack: "Emotional",
    tags: ["personal", "family", "care"],
    tint: "var(--coral-soft)",
    x: 234,
    y: -84,
  },
  {
    id: "plants",
    label: "Side project idea: local plants",
    stack: "Mental",
    tags: ["creative", "idea", "research"],
    tint: "var(--blue-mist)",
    x: -212,
    y: 118,
  },
  {
    id: "subscription",
    label: "Subscription box angle",
    stack: "Spiritual",
    tags: ["meaning", "pattern", "seed"],
    tint: "var(--blue-dusty)",
    x: 206,
    y: 128,
  },
];

const stackTints: Record<StackId, string> = {
  Physical: "var(--sage)",
  Emotional: "var(--coral-soft)",
  Mental: "var(--blue-dusty)",
  Spiritual: "var(--blue-mist)",
};

const stackPositions: Record<StackId, { x: number; y: number }> = {
  Physical: { x: -276, y: 238 },
  Emotional: { x: -92, y: 238 },
  Mental: { x: 92, y: 238 },
  Spiritual: { x: 276, y: 238 },
};

const softSpring = {
  damping: 15,
  mass: 0.8,
  stiffness: 130,
  type: "spring" as const,
};

const landSpring = {
  damping: 15,
  mass: 0.8,
  stiffness: 140,
  type: "spring" as const,
};

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    transition: softSpring,
    y: 0,
  },
};

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      <MeshBackdrop />
      <HeroSection />
      <ProblemSection />
      <InteractiveDemoSection />
      <PillarsSection />
      <FinalWaitlistSection />
      <Footer />
    </main>
  );
}

function MeshBackdrop() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {[
        { color: "rgba(153,167,183,0.13)", x: "12%", y: "6%", size: "34rem" },
        { color: "rgba(247,203,202,0.12)", x: "72%", y: "14%", size: "30rem" },
        { color: "rgba(189,215,216,0.14)", x: "50%", y: "70%", size: "38rem" },
      ].map((blob, index) => (
        <motion.div
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  x: index % 2 === 0 ? [0, 34, -18, 0] : [0, -28, 22, 0],
                  y: index % 2 === 0 ? [0, -24, 18, 0] : [0, 22, -18, 0],
                }
          }
          className="absolute rounded-full blur-3xl"
          key={blob.color}
          style={{
            background: blob.color,
            height: blob.size,
            left: blob.x,
            top: blob.y,
            width: blob.size,
          }}
          transition={{ duration: 34 + index * 4, ease: "easeInOut", repeat: Infinity }}
        />
      ))}
    </div>
  );
}

function HeroSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function submitWaitlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }

    console.log("waitlist signup", email);
    setSubmitted(true);
  }

  return (
    <section className="relative z-10 flex min-h-screen items-center justify-center px-5 py-16">
      <motion.div
        animate="show"
        className="mx-auto flex max-w-5xl flex-col items-center text-center"
        initial="hidden"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.1 } },
        }}
      >
        <motion.p
          className="font-serif text-4xl lowercase tracking-[-0.06em] text-[var(--text-primary)] sm:text-5xl"
          variants={sectionVariants}
        >
          Clutter
        </motion.p>
        <motion.h1
          className="mt-8 max-w-4xl text-balance font-serif text-5xl leading-[0.96] tracking-[-0.06em] text-[var(--text-primary)] sm:text-7xl lg:text-8xl"
          variants={sectionVariants}
        >
          Your mind doesn't need another to-do list. It needs somewhere to land.
        </motion.h1>
        <motion.p
          className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-[var(--text-secondary)] sm:text-xl"
          variants={sectionVariants}
        >
          Say what's on your mind without deciding where it belongs. Clutter gathers the thought,
          finds the shape, and holds it until you need it.
        </motion.p>

        <motion.div
          className="mt-10 flex w-full max-w-xl flex-col items-center justify-center gap-3 sm:flex-row"
          variants={sectionVariants}
        >
          <AnimatePresence mode="wait">
            {!isOpen ? (
              <motion.button
                className="rounded-full bg-[var(--blue-dusty)] px-7 py-4 text-sm font-semibold lowercase tracking-[0.08em] text-[var(--bg-elevated)] shadow-[0_18px_48px_rgba(120,134,158,0.22)]"
                key="open"
                onClick={() => setIsOpen(true)}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                join the waitlist
              </motion.button>
            ) : submitted ? (
              <motion.div
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="rounded-full border border-[rgba(143,168,160,0.35)] bg-[rgba(255,255,255,0.55)] px-7 py-4 text-sm lowercase text-[var(--text-secondary)] shadow-[0_18px_48px_rgba(120,134,158,0.14)] backdrop-blur-xl"
                initial={{ opacity: 0, scale: 0.92, y: 10 }}
                key="success"
                transition={landSpring}
              >
                tucked away. we'll send a note soon.
              </motion.div>
            ) : (
              <motion.form
                animate={{ opacity: 1, width: "100%" }}
                className="glass-shell flex rounded-full p-1"
                initial={{ opacity: 0, width: "72%" }}
                key="form"
                onSubmit={submitWaitlist}
                transition={softSpring}
              >
                <input
                  className="min-w-0 flex-1 bg-transparent px-5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your email"
                  type="email"
                  value={email}
                />
                <button
                  className="rounded-full bg-[var(--blue-dusty)] px-5 py-3 text-sm font-semibold lowercase text-[var(--bg-elevated)]"
                  type="submit"
                >
                  settle in
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <button
            className="rounded-full border border-[rgba(153,167,183,0.32)] px-7 py-4 text-sm font-semibold lowercase tracking-[0.08em] text-[var(--blue-slate)] transition hover:bg-[rgba(255,255,255,0.32)]"
            onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
            type="button"
          >
            see how it works
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}

function ProblemSection() {
  const statements = [
    {
      bg: "bg-[var(--bg-base)]",
      copy: "Your best ideas show up at the worst times.",
      icon: "spark",
    },
    {
      bg: "bg-[var(--blue-mist)]",
      copy: "Every app makes you decide where something goes before you've even finished the thought.",
      icon: "path",
    },
    {
      bg: "bg-[var(--bg-deep)]",
      copy: "Clutter just listens. The organizing happens after.",
      icon: "bowl",
    },
  ];

  return (
    <section className="relative z-10">
      {statements.map((statement) => (
        <motion.div
          className={`${statement.bg} flex min-h-[76vh] items-center justify-center px-5 py-20`}
          initial="hidden"
          key={statement.copy}
          variants={sectionVariants}
          viewport={{ amount: 0.45, once: true }}
          whileInView="show"
        >
          <div className="flex max-w-4xl flex-col items-center text-center">
            <ProblemIcon name={statement.icon} />
            <p className="mt-8 text-balance font-serif text-4xl leading-tight tracking-[-0.045em] text-[var(--text-primary)] sm:text-6xl">
              {statement.copy}
            </p>
          </div>
        </motion.div>
      ))}
    </section>
  );
}

function ProblemIcon({ name }: { name: string }) {
  return (
    <svg className="h-16 w-16 text-[var(--sage-deep)]" fill="none" viewBox="0 0 80 80">
      {name === "spark" ? (
        <>
          <path d="M40 12v18M40 50v18M12 40h18M50 40h18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          <circle cx="40" cy="40" r="8" stroke="currentColor" strokeWidth="2" />
        </>
      ) : null}
      {name === "path" ? (
        <path
          d="M14 50c14-24 30 16 52-12M21 24h20M46 56h14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      ) : null}
      {name === "bowl" ? (
        <>
          <path d="M18 36h44c-2 16-10 25-22 25S20 52 18 36Z" stroke="currentColor" strokeWidth="2" />
          <path d="M28 28c5-7 19-7 24 0" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </>
      ) : null}
    </svg>
  );
}

function InteractiveDemoSection() {
  return (
    <section
      className="relative z-10 bg-[var(--bg-base)] px-4 py-24 sm:px-6 lg:px-8"
      id="demo"
    >
      <motion.div
        className="mx-auto mb-10 max-w-3xl text-center"
        initial="hidden"
        variants={sectionVariants}
        viewport={{ amount: 0.35, once: true }}
        whileInView="show"
      >
        <p className="text-sm font-semibold lowercase tracking-[0.18em] text-[var(--blue-slate)]">
          interactive demo
        </p>
        <h2 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.05em] sm:text-6xl">
          watch a thought find its home
        </h2>
        <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
          No microphone, no account. Click through the core flow and feel the moment where active
          clutter becomes held memory.
        </p>
      </motion.div>
      <ClutterDemo />
    </section>
  );
}

function ClutterDemo() {
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<DemoPhase>("ambient");
  const [visibleWords, setVisibleWords] = useState(0);
  const [selectedCard, setSelectedCard] = useState<DemoCard | null>(null);
  const [note, setNote] = useState("");

  const visibleText = useMemo(() => demoWords.slice(0, visibleWords), [visibleWords]);
  const isBlooming = phase === "bloom" || phase === "encapsulated";

  useEffect(() => {
    if (phase !== "capture") {
      return;
    }

    setVisibleWords(0);
    const interval = window.setInterval(() => {
      setVisibleWords((current) => {
        if (current >= demoWords.length) {
          window.clearInterval(interval);
          window.setTimeout(() => setPhase("bloom"), prefersReducedMotion ? 120 : 600);
          return current;
        }

        return current + 1;
      });
    }, prefersReducedMotion ? 40 : 120);

    return () => window.clearInterval(interval);
  }, [phase, prefersReducedMotion]);

  function resetDemo() {
    setSelectedCard(null);
    setNote("");
    setVisibleWords(0);
    setPhase("ambient");
  }

  function startCapture() {
    setSelectedCard(null);
    setPhase("capture");
  }

  return (
    <motion.div
      className="glass-shell relative mx-auto h-[48rem] max-w-6xl overflow-hidden rounded-[2.5rem] bg-[rgba(255,255,255,0.42)] p-4 shadow-[0_36px_120px_rgba(120,134,158,0.16)] sm:p-6"
      initial={{ opacity: 0, y: 32 }}
      transition={softSpring}
      viewport={{ amount: 0.18, once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle_at_50%_20%,rgba(189,215,216,0.25),transparent_22rem),radial-gradient(circle_at_80%_70%,rgba(247,203,202,0.2),transparent_19rem)]" />

      {isBlooming ? <DemoNav /> : null}

      <div className="relative h-full">
        <AnimatePresence mode="popLayout">
          {phase === "ambient" || phase === "capture" ? (
            <motion.div
              animate={{ opacity: 1 }}
              className="flex h-full flex-col items-center justify-center"
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              initial={{ opacity: 0 }}
              key="capture"
            >
              <DemoOrb isCapturing={phase === "capture"} />
              <motion.div
                animate={{ maxWidth: phase === "capture" ? 720 : 580 }}
                className="glass-shell mt-8 flex min-h-16 w-full items-center gap-3 rounded-full p-2"
                transition={softSpring}
              >
                {phase === "capture" ? <SmallAnchorOrb /> : null}
                <div className="min-w-0 flex-1 px-3">
                  {phase === "capture" ? (
                    <div className="flex min-h-12 flex-wrap items-center gap-x-1.5 gap-y-1 text-left text-sm leading-6 text-[var(--text-primary)] sm:text-base">
                      <AnimatePresence initial={false}>
                        {visibleText.map((word, index) => (
                          <motion.span
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-block"
                            initial={{ opacity: 0, y: 4 }}
                            key={`${word}-${index}`}
                            transition={softSpring}
                          >
                            {word}
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <span className="block px-2 text-left text-[var(--text-muted)]">
                      what's on your mind?
                    </span>
                  )}
                </div>
                {phase === "capture" ? <Waveform /> : null}
                <motion.button
                  aria-label="try the demo"
                  className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--blue-dusty)] text-[var(--bg-elevated)] shadow-[0_12px_30px_rgba(120,134,158,0.22)]"
                  onClick={phase === "capture" ? () => setPhase("bloom") : startCapture}
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <MicIcon />
                  <span className="pointer-events-none absolute -top-10 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--text-primary)] px-3 py-1 text-xs text-[var(--bg-base)] group-hover:block">
                    click to try the demo
                  </span>
                </motion.button>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {isBlooming ? (
          <BloomScene
            note={note}
            onEncapsulate={() => {
              setSelectedCard(null);
              setPhase("encapsulated");
            }}
            onNoteChange={setNote}
            onReset={resetDemo}
            phase={phase}
            selectedCard={selectedCard}
            setSelectedCard={setSelectedCard}
          />
        ) : null}
      </div>
    </motion.div>
  );
}

function DemoOrb({ isCapturing }: { isCapturing: boolean }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      animate={
        prefersReducedMotion
          ? undefined
          : {
              rotate: [0, 8, -6, 0],
              scale: isCapturing ? 0.15 : [1, 1.03, 1],
              x: isCapturing ? -260 : 0,
              y: isCapturing ? 118 : 0,
            }
      }
      className="h-44 w-44 rounded-full bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.62),transparent_22%),radial-gradient(circle_at_30%_75%,var(--blue-dusty),transparent_34%),radial-gradient(circle_at_70%_35%,var(--sage),transparent_35%),radial-gradient(circle_at_70%_72%,var(--coral-soft),transparent_30%)] shadow-[0_28px_80px_rgba(153,167,183,0.22)]"
      transition={{ duration: 4, ease: "easeInOut", repeat: isCapturing ? 0 : Infinity }}
    />
  );
}

function SmallAnchorOrb() {
  return (
    <motion.div
      animate={{ opacity: [0.45, 0.7, 0.45], scale: [1, 1.08, 1] }}
      className="ml-2 h-8 w-8 shrink-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,var(--bg-elevated),var(--sage),var(--blue-dusty))]"
      transition={{ duration: 1.7, ease: "easeInOut", repeat: Infinity }}
    />
  );
}

function Waveform() {
  const bars = [0.34, 0.62, 0.44, 0.78, 0.5, 0.92, 0.58, 0.72, 0.4, 0.66];

  return (
    <div className="hidden h-10 w-28 items-center justify-center gap-1 sm:flex">
      {bars.map((bar, index) => (
        <motion.span
          animate={{ scaleY: [0.35, bar, 0.5, Math.max(0.3, bar - 0.18)] }}
          className="h-8 w-1 rounded-full bg-[var(--blue-dusty)]"
          key={`${bar}-${index}`}
          style={{ transformOrigin: "center" }}
          transition={{ delay: index * 0.05, duration: 0.8, repeat: Infinity, repeatType: "mirror" }}
        />
      ))}
    </div>
  );
}

function DemoNav() {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="absolute left-1/2 top-6 z-20 flex -translate-x-1/2 rounded-full border border-[rgba(153,167,183,0.22)] bg-[rgba(255,255,255,0.48)] p-1 text-xs lowercase text-[var(--text-muted)] backdrop-blur-xl"
      initial={{ opacity: 0, y: -10 }}
      transition={softSpring}
    >
      {["timeline", "map", "categories"].map((item) => (
        <span
          className={`rounded-full px-4 py-2 ${item === "map" ? "bg-[var(--blue-dusty)] text-[var(--bg-elevated)]" : ""}`}
          key={item}
        >
          {item}
        </span>
      ))}
    </motion.div>
  );
}

function BloomScene({
  note,
  onEncapsulate,
  onNoteChange,
  onReset,
  phase,
  selectedCard,
  setSelectedCard,
}: {
  note: string;
  onEncapsulate: () => void;
  onNoteChange: (note: string) => void;
  onReset: () => void;
  phase: DemoPhase;
  selectedCard: DemoCard | null;
  setSelectedCard: (card: DemoCard | null) => void;
}) {
  const isEncapsulated = phase === "encapsulated";

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="absolute inset-0 pt-16"
      initial={{ opacity: 0 }}
      transition={softSpring}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="-360 -280 720 560">
        {demoCards.slice(0, -1).map((card, index) => {
          const nextCard = demoCards[index + 1];

          return (
            <motion.path
              animate={{ opacity: isEncapsulated ? 0 : 0.4, pathLength: isEncapsulated ? 0 : 1 }}
              d={`M ${card.x} ${card.y} C ${card.x * 0.45} ${card.y * 0.18}, ${
                nextCard.x * 0.45
              } ${nextCard.y * 0.18}, ${nextCard.x} ${nextCard.y}`}
              fill="none"
              initial={{ opacity: 0, pathLength: 0 }}
              key={`${card.id}-${nextCard.id}`}
              stroke="var(--sage-deep)"
              strokeLinecap="round"
              strokeWidth="2"
              transition={{ delay: 0.32 + index * 0.12, duration: 0.7 }}
            />
          );
        })}
      </svg>

      <div className="absolute left-1/2 top-[42%] h-0 w-0">
        {demoCards.map((card, index) => (
          <DemoThoughtCard
            card={card}
            index={index}
            isEncapsulated={isEncapsulated}
            key={card.id}
            onClick={() => !isEncapsulated && setSelectedCard(card)}
          />
        ))}
      </div>

      <StackDock isEncapsulated={isEncapsulated} />

      <AnimatePresence>
        {!isEncapsulated ? (
          <motion.button
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[var(--coral-soft)] px-7 py-4 text-sm font-semibold lowercase text-[var(--text-primary)] shadow-[0_18px_48px_rgba(232,180,176,0.24)]"
            exit={{ opacity: 0, y: 10 }}
            initial={{ opacity: 0, y: 10 }}
            onClick={onEncapsulate}
            transition={softSpring}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            gather
          </motion.button>
        ) : (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            transition={{ ...softSpring, delay: 0.7 }}
          >
            <p className="text-sm lowercase tracking-[0.12em] text-[var(--text-secondary)]">
              gathered.
            </p>
            <button
              className="text-sm lowercase text-[var(--blue-slate)] underline decoration-[rgba(120,134,158,0.28)] underline-offset-4"
              onClick={onReset}
              type="button"
            >
              try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <DetailPanel
        card={selectedCard}
        note={note}
        onChangeNote={onNoteChange}
        onClose={() => setSelectedCard(null)}
      />
    </motion.div>
  );
}

function DemoThoughtCard({
  card,
  index,
  isEncapsulated,
  onClick,
}: {
  card: DemoCard;
  index: number;
  isEncapsulated: boolean;
  onClick: () => void;
}) {
  const destination = stackPositions[card.stack];

  return (
    <motion.button
      animate={{
        filter: isEncapsulated ? "saturate(0.45)" : "saturate(1)",
        opacity: 1,
        scale: isEncapsulated ? 0.35 : 1,
        x: isEncapsulated ? destination.x : card.x,
        y: isEncapsulated ? destination.y : card.y,
      }}
      className="glass-card absolute flex h-24 w-44 items-center justify-center rounded-[1.4rem] px-5 text-center text-sm font-semibold leading-5 text-[var(--text-primary)]"
      initial={{ opacity: 0, scale: 0.48, x: 0, y: 0 }}
      onClick={onClick}
      style={{ borderColor: card.tint, marginLeft: -88, marginTop: -48 }}
      transition={{ ...(isEncapsulated ? landSpring : softSpring), delay: index * 0.1 }}
      type="button"
      whileHover={isEncapsulated ? undefined : { y: card.y - 4 }}
    >
      {card.label}
    </motion.button>
  );
}

function StackDock({ isEncapsulated }: { isEncapsulated: boolean }) {
  return (
    <div className="absolute bottom-20 left-1/2 h-24 w-[42rem] max-w-[calc(100%-2rem)] -translate-x-1/2">
      {Object.entries(stackPositions).map(([stack, position], index) => {
        const stackName = stack as StackId;
        const cardsInStack = demoCards.filter((card) => card.stack === stackName);

        return (
          <motion.div
            animate={
              isEncapsulated
                ? { opacity: 1, scale: [1, 1.02, 1], y: 0 }
                : { opacity: 0.52, scale: 1, y: 0 }
            }
            className="absolute flex w-28 flex-col items-center"
            initial={{ opacity: 0, y: 12 }}
            key={stackName}
            style={{
              left: `calc(50% + ${position.x}px)`,
              marginLeft: -56,
              top: 0,
            }}
            transition={{
              delay: isEncapsulated ? 0.44 + index * 0.12 : index * 0.08,
              duration: isEncapsulated ? 5 : 0.45,
              ease: "easeInOut",
              repeat: isEncapsulated ? Infinity : 0,
            }}
          >
            <motion.div
              animate={isEncapsulated ? { scale: [1, 1.05, 1] } : undefined}
              className="relative h-14 w-20"
              transition={{ delay: 0.36 + index * 0.1, duration: 0.22 }}
            >
              {[0, 1, 2].map((layer) => (
                <div
                  className="absolute h-12 w-20 rounded-2xl border bg-[rgba(255,255,255,0.56)] shadow-[0_12px_28px_rgba(120,134,158,0.13)] backdrop-blur-xl"
                  key={layer}
                  style={{
                    borderColor: stackTints[stackName],
                    left: layer * 2,
                    opacity: layer < cardsInStack.length || isEncapsulated ? 1 : 0.38,
                    top: layer * 4,
                  }}
                />
              ))}
            </motion.div>
            <span className="mt-4 text-[0.62rem] font-semibold lowercase tracking-[0.14em] text-[var(--text-secondary)]">
              {stackName}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

function DetailPanel({
  card,
  note,
  onChangeNote,
  onClose,
}: {
  card: DemoCard | null;
  note: string;
  onChangeNote: (note: string) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {card ? (
        <>
          <motion.button
            aria-label="close detail panel"
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 bg-transparent"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            type="button"
          />
          <motion.aside
            animate={{ opacity: 1, x: 0, y: 0 }}
            className="glass-shell absolute bottom-0 right-0 z-30 flex h-[70%] w-full flex-col rounded-t-[2rem] p-6 sm:bottom-6 sm:right-6 sm:h-[calc(100%-6rem)] sm:w-[22rem] sm:rounded-[2rem]"
            exit={{ opacity: 0, x: 40, y: 20 }}
            initial={{ opacity: 0, x: 80, y: 20 }}
            transition={softSpring}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold lowercase tracking-[0.18em] text-[var(--blue-slate)]">
                  gathered node
                </p>
                <h3 className="mt-3 text-2xl font-serif leading-tight tracking-[-0.035em]">
                  {card.label}
                </h3>
              </div>
              <button className="text-sm text-[var(--text-muted)]" onClick={onClose} type="button">
                close
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {card.tags.map((tag, index) => (
                <span
                  className="rounded-full px-3 py-1 text-xs lowercase text-[var(--text-primary)]"
                  key={tag}
                  style={{
                    background:
                      index % 3 === 0
                        ? "var(--blue-mist)"
                        : index % 3 === 1
                          ? "var(--sage)"
                          : "var(--coral-soft)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <label className="mt-7 text-sm lowercase text-[var(--text-secondary)]" htmlFor="demo-note">
              add a note
            </label>
            <textarea
              className="mt-3 min-h-32 resize-none rounded-3xl border border-[rgba(153,167,183,0.24)] bg-[rgba(255,255,255,0.52)] p-4 text-sm leading-6 outline-none placeholder:text-[var(--text-muted)]"
              id="demo-note"
              onChange={(event) => onChangeNote(event.target.value)}
              placeholder="anything else to remember?"
              value={note}
            />
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function PillarsSection() {
  const pillars: { name: StackId; copy: string }[] = [
    { name: "Physical", copy: "errands, bodies, places, logistics" },
    { name: "Emotional", copy: "people, care, feelings, repair" },
    { name: "Mental", copy: "ideas, plans, research, decisions" },
    { name: "Spiritual", copy: "meaning, values, patterns, direction" },
  ];

  return (
    <section className="relative z-10 bg-[var(--bg-base)] px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial="hidden"
          variants={sectionVariants}
          viewport={{ once: true }}
          whileInView="show"
        >
          <p className="text-sm font-semibold lowercase tracking-[0.18em] text-[var(--blue-slate)]">
            four soft homes
          </p>
          <h2 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.05em] sm:text-6xl">
            Everything you capture gets a home - automatically.
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-5 md:grid-cols-4">
          {pillars.map((pillar, index) => (
            <motion.div
              className="glass-shell relative min-h-64 overflow-hidden rounded-[2rem] p-6"
              initial={{ opacity: 0, y: 24 }}
              key={pillar.name}
              transition={{ ...softSpring, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <div className="relative h-24">
                {[0, 1, 2].map((layer) => (
                  <div
                    className="absolute h-20 w-28 rounded-[1.4rem] border bg-[rgba(255,255,255,0.5)] shadow-[0_18px_44px_rgba(120,134,158,0.13)]"
                    key={layer}
                    style={{
                      borderColor: stackTints[pillar.name],
                      left: layer * 8,
                      top: layer * 7,
                    }}
                  />
                ))}
              </div>
              <h3 className="mt-8 font-serif text-3xl tracking-[-0.045em]">{pillar.name}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{pillar.copy}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalWaitlistSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [count, setCount] = useState(247);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCount((current) => current + 1);
    }, 9000);

    return () => window.clearInterval(timer);
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }

    console.log("waitlist signup", email);
    setSubmitted(true);
  }

  return (
    <section className="relative z-10 bg-[var(--bg-deep)] px-5 py-28">
      <motion.div
        className="mx-auto flex max-w-3xl flex-col items-center text-center"
        initial="hidden"
        variants={sectionVariants}
        viewport={{ once: true }}
        whileInView="show"
      >
        <h2 className="font-serif text-5xl leading-tight tracking-[-0.055em] sm:text-7xl">
          Be first to think out loud.
        </h2>
        <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--text-secondary)]">
          leave your email. we will hold the place softly.
        </p>
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="glass-shell mt-10 flex items-center gap-3 rounded-[1.4rem] px-6 py-5 text-left shadow-[0_24px_70px_rgba(120,134,158,0.16)]"
              initial={{ opacity: 0, scale: 0.82, y: -24 }}
              key="final-success"
              transition={landSpring}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sage)] text-[var(--text-primary)]">
                <CheckIcon />
              </span>
              <span className="text-sm lowercase text-[var(--text-secondary)]">
                you're gathered into the waitlist.
              </span>
            </motion.div>
          ) : (
            <motion.form
              className="glass-shell mt-10 flex w-full max-w-xl rounded-full p-1.5"
              key="final-form"
              onSubmit={onSubmit}
            >
              <input
                className="min-w-0 flex-1 bg-transparent px-5 text-sm outline-none placeholder:text-[var(--text-muted)]"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email address"
                type="email"
                value={email}
              />
              <button
                className="rounded-full bg-[var(--coral-soft)] px-6 py-4 text-sm font-semibold lowercase text-[var(--text-primary)] transition hover:bg-[var(--coral-deep)]"
                type="submit"
              >
                join
              </button>
            </motion.form>
          )}
        </AnimatePresence>
        <p className="mt-6 text-sm lowercase tracking-[0.08em] text-[var(--text-muted)]">
          {count} people already waiting
        </p>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-[rgba(153,167,183,0.18)] bg-[var(--bg-deep)] px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center text-sm text-[var(--text-secondary)] sm:flex-row sm:text-left">
        <p className="font-serif text-2xl tracking-[-0.05em] text-[var(--text-primary)]">Clutter</p>
        <p>say what's on your mind. we'll hold onto it.</p>
        <div className="flex gap-5 lowercase">
          <a className="hover:text-[var(--blue-slate)]" href="mailto:hello@example.com">
            contact
          </a>
          <a className="hover:text-[var(--blue-slate)]" href="#demo">
            demo
          </a>
        </div>
      </div>
    </footer>
  );
}

function MicIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 4a3 3 0 0 0-3 3v5a3 3 0 1 0 6 0V7a3 3 0 0 0-3-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16">
      <path d="m3.5 8.2 2.7 2.6 6.3-6.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}
