"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { FORMSPREE_ENDPOINT } from "@/lib/contact";

type FormStatus = "idle" | "submitting" | "success" | "error";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional mailto shown as secondary action. */
  mailtoEmail?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ContactModal({
  open,
  onClose,
  mailtoEmail,
}: ContactModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeRef.current?.focus();
    }, 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setErrorMessage(null);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    }
  }, [open]);

  if (!open) return null;

  function trapTab(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || !panelRef.current) return;
    const nodes = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    const trimmedSubject = subject.trim();

    if (!trimmedName) {
      setErrorMessage("Please enter your name.");
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email.");
      return;
    }
    if (!trimmedMessage) {
      setErrorMessage("Please enter a message.");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage,
          ...(trimmedSubject ? { subject: trimmedSubject } : {}),
          _replyto: trimmedEmail,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        errors?: { message?: string }[];
      };
      if (!res.ok) {
        const fromList = data.errors?.[0]?.message;
        throw new Error(data.error || fromList || "Something went wrong.");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Could not send. Try again.",
      );
    }
  }

  return (
    <div
      className="contact-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="contact-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onKeyDown={trapTab}
      >
        <div className="contact-modal__header">
          <div>
            <p className="contact-modal__eyebrow">Contact</p>
            <h2 id={titleId} className="contact-modal__title">
              Say hello
            </h2>
            <p id={descId} className="contact-modal__lede">
              Exhibitions, research, writing — drop a note.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="contact-modal__close"
            onClick={onClose}
            aria-label="Close contact form"
          >
            Close
          </button>
        </div>

        {status === "success" ? (
          <div className="contact-modal__success" role="status">
            <p className="contact-modal__success-title">Message sent</p>
            <p className="contact-modal__success-body">
              Thanks — I will get back to you soon.
            </p>
            <button
              type="button"
              className="contact-modal__submit"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <form className="contact-modal__form" onSubmit={onSubmit} noValidate>
            <label className="contact-modal__field">
              <span>Name</span>
              <input
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={status === "submitting"}
              />
            </label>
            <label className="contact-modal__field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === "submitting"}
              />
            </label>
            <label className="contact-modal__field">
              <span>
                Subject <em>(optional)</em>
              </span>
              <input
                name="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={status === "submitting"}
              />
            </label>
            <label className="contact-modal__field">
              <span>Message</span>
              <textarea
                name="message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                disabled={status === "submitting"}
              />
            </label>

            {errorMessage || status === "error" ? (
              <p className="contact-modal__error" role="alert">
                {errorMessage || "Could not send. Try again."}
              </p>
            ) : null}

            <div className="contact-modal__actions">
              <button
                type="submit"
                className="contact-modal__submit"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? "Sending…" : "Send message"}
              </button>
              {mailtoEmail ? (
                <a
                  className="contact-modal__mailto"
                  href={`mailto:${mailtoEmail}`}
                >
                  Or email {mailtoEmail}
                </a>
              ) : null}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
