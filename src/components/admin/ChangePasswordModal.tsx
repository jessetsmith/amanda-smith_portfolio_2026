"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { ADMIN_PASSWORD_MIN_LENGTH } from "@/lib/auth-constants";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ChangePasswordModal({ open, onClose }: Props) {
  const titleId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(false);
    setPending(false);
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, pending]);

  if (!open) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not update password");
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Could not update password");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/40 px-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={onSubmit}
        className="w-full max-w-md border border-ink/20 bg-paper p-6 shadow-none"
      >
        <p className="font-mono text-[0.65rem] tracking-[0.2em] text-rust uppercase">
          Security
        </p>
        <h2
          id={titleId}
          className="mt-1 font-display text-2xl tracking-tight text-ink"
        >
          Change password
        </h2>
        <p className="mt-2 text-sm text-ink/65">
          Stores a new bcrypt hash in Sanity. The plaintext password is never
          saved.
        </p>

        <label className="mt-6 block text-sm text-ink">
          Current password
          <input
            ref={firstFieldRef}
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 w-full border border-ink/25 bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-rust"
          />
        </label>

        <label className="mt-4 block text-sm text-ink">
          New password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={ADMIN_PASSWORD_MIN_LENGTH}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full border border-ink/25 bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-rust"
          />
        </label>

        <label className="mt-4 block text-sm text-ink">
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={ADMIN_PASSWORD_MIN_LENGTH}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full border border-ink/25 bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-rust"
          />
        </label>

        <p className="mt-2 font-mono text-[0.65rem] tracking-[0.08em] text-ink/45">
          Minimum {ADMIN_PASSWORD_MIN_LENGTH} characters
        </p>

        {error ? (
          <p className="mt-4 text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 text-sm text-ink" role="status">
            Password updated. Use the new password next time you sign in.
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="cursor-pointer border border-ink/20 px-3 py-2 font-mono text-[0.65rem] tracking-[0.14em] text-ink uppercase disabled:opacity-50"
          >
            {success ? "Close" : "Cancel"}
          </button>
          {!success ? (
            <button
              type="submit"
              disabled={pending}
              className="cursor-pointer bg-ink px-3 py-2 font-mono text-[0.65rem] tracking-[0.14em] text-paper uppercase disabled:opacity-50"
            >
              {pending ? "Updating…" : "Update password"}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
