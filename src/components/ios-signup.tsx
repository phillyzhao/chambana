"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Coffee,
  Film,
  Headphones,
  Palette,
  Pause,
  Play,
  Plus,
  Trees,
  Utensils,
  Volleyball,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import styles from "./ios-signup.module.css";

export type SignupProfile = {
  name: string;
  handle: string;
  interests: string[];
};

const interests = [
  { name: "Coffee", icon: Coffee },
  { name: "Outdoors", icon: Trees },
  { name: "Books", icon: BookOpen },
  { name: "Food", icon: Utensils },
  { name: "Music", icon: Headphones },
  { name: "Film", icon: Film },
  { name: "Sports", icon: Volleyball },
  { name: "Art", icon: Palette },
];

const titles = [
  "Hello, Japan House.",
  "What should we call you?",
  "Your Illinois email.",
  "Confirm your email.",
  "Make it yours.",
  "What brings you out?",
];

const welcomeScenes = [
  {
    place: "Japan House",
    image: "/design-assets/campus.jpg",
    description: "A quiet path beside the Japan House garden pond",
    position: "50% 50%",
  },
  {
    place: "State Farm Center",
    image: "/design-assets/state-farm-center.jpg",
    description: "The domed exterior of State Farm Center in Champaign",
    position: "50% 64%",
  },
  {
    place: "Busey Evans",
    image: "/design-assets/busey-evans.jpg",
    description: "Busey Hall at the Busey-Evans residence halls in Urbana",
    position: "52% 50%",
  },
  {
    place: "Ikenberry",
    image: "/design-assets/ikenberry.jpg",
    description: "Bookshelves and study space inside the Ikenberry library",
    position: "55% 50%",
  },
];

export function SignupFlow({
  onComplete,
  onBack,
  active = true,
}: {
  onComplete: (profile: SignupProfile) => void;
  onBack: () => void;
  active?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [handle, setHandle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [welcomeScene, setWelcomeScene] = useState(0);
  const [rotationPaused, setRotationPaused] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const firstName = name.trim().split(/\s+/)[0];
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  const title = step === 6 ? `Welcome, ${firstName}.` : titles[step];

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
    if (titleRef.current?.getClientRects().length) {
      titleRef.current.focus({ preventScroll: true });
    }
  }, [step]);

  useEffect(() => {
    if (active) setWelcomeScene(0);
  }, [active]);

  useEffect(() => {
    if (!active || step !== 0) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let interval: ReturnType<typeof setInterval> | undefined;

    function syncRotation() {
      clearInterval(interval);
      if (rotationPaused || reducedMotion.matches || document.hidden) return;
      interval = setInterval(() => {
        setWelcomeScene((current) => (current + 1) % welcomeScenes.length);
      }, 7500);
    }

    syncRotation();
    reducedMotion.addEventListener("change", syncRotation);
    document.addEventListener("visibilitychange", syncRotation);
    return () => {
      clearInterval(interval);
      reducedMotion.removeEventListener("change", syncRotation);
      document.removeEventListener("visibilitychange", syncRotation);
    };
  }, [active, step, rotationPaused]);

  function goTo(next: number) {
    setError("");
    setStep(next);
  }

  function reject(message: string) {
    setError(message);
    inputRef.current?.focus();
  }

  function advance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1 && (name.trim().length < 2 || name.trim().length > 40)) {
      reject("Use 2–40 characters.");
      return;
    }
    if (step === 2 && !/^[^\s@]+@illinois\.edu$/i.test(email.trim())) {
      reject("Use your @illinois.edu email.");
      return;
    }
    if (step === 3 && code !== "123456") {
      reject("Use the demo code: 123456.");
      return;
    }
    if (step === 4 && !/^[a-z][a-z0-9._]{2,19}$/i.test(handle)) {
      reject(
        "3–20 letters, numbers, dots or underscores. Start with a letter.",
      );
      return;
    }
    if (step === 6) {
      onComplete({
        name: name.trim(),
        handle: handle.toLowerCase(),
        interests: selected,
      });
      return;
    }
    goTo(step + 1);
  }

  function toggleInterest(interest: string) {
    setSelected((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  }

  return (
    <section
      className={styles.flow}
      aria-label="Demo signup"
      data-signup-step={step}
    >
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.back}
          aria-label={step === 0 ? "Back to app" : "Previous signup step"}
          onClick={() => (step === 0 ? onBack() : goTo(step - 1))}
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <span className={styles.wordmark}>chambana.</span>
        <span
          className={styles.stepCount}
          aria-label={step > 0 && step < 6 ? `Step ${step} of 5` : undefined}
        >
          {step > 0 && step < 6 ? `${String(step).padStart(2, "0")} / 05` : ""}
        </span>
      </header>

      <form className={styles.form} onSubmit={advance} noValidate>
        <div className={styles.content} ref={contentRef}>
          {step > 0 && step < 6 ? (
            <div className={styles.progress} aria-hidden="true">
              {[1, 2, 3, 4, 5].map((index) => (
                <span key={index} data-complete={index <= step} />
              ))}
            </div>
          ) : null}
          <div className={styles.stage} key={step}>
            <h2
              ref={titleRef}
              tabIndex={-1}
              id={`${id}-title`}
              className={`${styles.title} ${step === 0 ? styles.welcomeTitle : ""}`}
              aria-label={
                step === 0
                  ? `Hello, ${welcomeScenes[welcomeScene].place}.`
                  : undefined
              }
            >
              {step === 0
                ? welcomeScenes.map((scene, index) => (
                    <span
                      className={styles.welcomeGreeting}
                      data-active={index === welcomeScene}
                      key={scene.place}
                      aria-hidden="true"
                    >
                      Hello,
                      <br />
                      {scene.place}.
                    </span>
                  ))
                : title}
            </h2>

            {step === 0 ? (
              <figure className={styles.welcomeFigure}>
                <div
                  className={styles.welcomeImage}
                  role="img"
                  aria-label={welcomeScenes[welcomeScene].description}
                >
                  {welcomeScenes.map((scene, index) => (
                    <div
                      className={styles.welcomePhoto}
                      data-active={index === welcomeScene}
                      key={scene.place}
                      style={{
                        backgroundImage: `url("${scene.image}")`,
                        backgroundPosition: scene.position,
                      }}
                    />
                  ))}
                </div>
                <figcaption className={styles.welcomeCaption}>
                  <a
                    href="/design-assets/CREDITS.md"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Photo credits
                  </a>
                  <button
                    type="button"
                    className={styles.rotationControl}
                    aria-label={
                      rotationPaused
                        ? "Play campus photos"
                        : "Pause campus photos"
                    }
                    onClick={() => setRotationPaused((current) => !current)}
                  >
                    {rotationPaused ? <Play size={13} /> : <Pause size={13} />}
                  </button>
                </figcaption>
              </figure>
            ) : null}

            {step === 1 ? (
              <div className={styles.field}>
                <label htmlFor={`${id}-name`}>Your name</label>
                <input
                  ref={inputRef}
                  id={`${id}-name`}
                  name="name"
                  autoComplete="given-name"
                  autoCapitalize="words"
                  placeholder="First name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError("");
                  }}
                  maxLength={40}
                  aria-invalid={!!error}
                  aria-describedby={error ? `${id}-error` : undefined}
                />
              </div>
            ) : null}

            {step === 2 ? (
              <div className={styles.field}>
                <label htmlFor={`${id}-email`}>Email address</label>
                <input
                  ref={inputRef}
                  id={`${id}-email`}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="you@illinois.edu"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  maxLength={254}
                  aria-invalid={!!error}
                  aria-describedby={error ? `${id}-error` : undefined}
                />
              </div>
            ) : null}

            {step === 3 ? (
              <div className={styles.field}>
                <span className={styles.email}>
                  {email.trim().toLowerCase()}
                </span>
                <label htmlFor={`${id}-code`}>Verification code</label>
                <input
                  ref={inputRef}
                  className={styles.code}
                  id={`${id}-code`}
                  name="demo-code"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  aria-invalid={!!error}
                  aria-describedby={`${id}-demo-code${error ? ` ${id}-error` : ""}`}
                />
                <button
                  id={`${id}-demo-code`}
                  type="button"
                  className={styles.demoCode}
                  onClick={() => {
                    setCode("123456");
                    setError("");
                    inputRef.current?.focus();
                  }}
                >
                  Use demo code <span>123456</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            ) : null}

            {step === 4 ? (
              <div className={styles.field}>
                <label htmlFor={`${id}-handle`}>Username</label>
                <div className={styles.handleField}>
                  <span aria-hidden="true">@</span>
                  <input
                    ref={inputRef}
                    id={`${id}-handle`}
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="yourname"
                    value={handle}
                    onChange={(event) => {
                      setHandle(event.target.value.toLowerCase());
                      setError("");
                    }}
                    maxLength={20}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${id}-error` : undefined}
                  />
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <fieldset className={styles.interests}>
                <legend>
                  Interests <span>Optional</span>
                </legend>
                <div className={styles.interestGrid}>
                  {interests.map(({ name: interest, icon: Icon }) => {
                    const chosen = selected.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        aria-pressed={chosen}
                        onClick={() => toggleInterest(interest)}
                      >
                        <Icon size={18} strokeWidth={1.4} />
                        <span>{interest}</span>
                        {chosen ? <Check size={15} /> : <Plus size={15} />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            {step === 6 ? (
              <div className={styles.profile}>
                <span className={styles.avatar} aria-hidden="true">
                  {initials}
                </span>
                <h3>{name.trim()}</h3>
                <span className={styles.handle}>@{handle}</span>
                {selected.length ? (
                  <div className={styles.selectedInterests}>
                    {selected.map((interest) => (
                      <span key={interest}>{interest}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {error ? (
              <p className={styles.error} id={`${id}-error`} role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
        <footer className={styles.footer}>
          <button className={styles.primary} type="submit">
            <span>
              {step === 0
                ? "Get started"
                : step === 6
                  ? "Enter Chambana"
                  : step === 5 && !selected.length
                    ? "Skip for now"
                    : "Continue"}
            </span>
            <ArrowRight size={18} strokeWidth={1.5} />
          </button>
          <span className={styles.demoNotice}>
            {step === 3 ? "Demo · No email sent" : "Demo · No account created"}
          </span>
        </footer>
      </form>
    </section>
  );
}
