import { useState, useEffect, useCallback } from "react";

interface TypewriterPhraseProps {
  phrases: string[];
  intervalSeconds?: number;
  typingSpeed?: number;
  deletingSpeed?: number;
}

export function TypewriterPhrase({
  phrases,
  intervalSeconds = 30,
  typingSpeed = 50,
  deletingSpeed = 30,
}: TypewriterPhraseProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const currentPhrase = phrases[currentIndex] || "";

  const tick = useCallback(() => {
    if (isPaused) return;

    if (!isDeleting) {
      if (displayText.length < currentPhrase.length) {
        setDisplayText(currentPhrase.slice(0, displayText.length + 1));
      } else {
        setIsPaused(true);
        setTimeout(() => {
          setIsPaused(false);
          setIsDeleting(true);
        }, intervalSeconds * 1000);
      }
    } else {
      if (displayText.length > 0) {
        setDisplayText(displayText.slice(0, -1));
      } else {
        setIsDeleting(false);
        setCurrentIndex((prev) => (prev + 1) % phrases.length);
      }
    }
  }, [displayText, isDeleting, isPaused, currentPhrase, phrases.length, intervalSeconds]);

  useEffect(() => {
    if (phrases.length === 0) return;
    const speed = isDeleting ? deletingSpeed : typingSpeed;
    const timer = setTimeout(tick, isPaused ? 100 : speed);
    return () => clearTimeout(timer);
  }, [tick, isDeleting, isPaused, typingSpeed, deletingSpeed, phrases.length]);

  useEffect(() => {
    setDisplayText("");
    setIsDeleting(false);
    setIsPaused(false);
    setCurrentIndex(0);
  }, [phrases]);

  if (phrases.length === 0) return null;

  return (
    <span data-testid="text-hero-phrase">
      {displayText}
      <span className="inline-block w-[3px] h-[1em] bg-primary/70 ml-1 align-middle animate-pulse" />
    </span>
  );
}
