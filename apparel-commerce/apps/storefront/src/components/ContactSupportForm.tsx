"use client";

import { useCallback, useState } from "react";
import { getSupportEmail, getSupportPhoneDisplay } from "@/lib/public-site";

export function ContactSupportForm() {
  const email = getSupportEmail();
  const phone = getSupportPhoneDisplay();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const submitMailto = useCallback(() => {
    if (!email) {
      setStatus("Set NEXT_PUBLIC_SUPPORT_EMAIL to enable email.");
      return;
    }
    const encSub = encodeURIComponent(subject || "Maharlika — Customer inquiry");
    const encBody = encodeURIComponent(body);
    window.location.href = `mailto:${email}?subject=${encSub}&body=${encBody}`;
    setStatus("Your mail app should open. If nothing happens, copy our email from below.");
  }, [email, subject, body]);

  return (
    <div className="space-y-6 font-body text-on-surface-variant">
      {email ? (
        <p className="text-sm">
          <span className="font-medium text-primary">Email:</span>{" "}
          <a className="underline hover:text-primary" href={`mailto:${email}`}>
            {email}
          </a>
        </p>
      ) : (
        <p className="text-sm text-error">
          Customer email is not configured. Add <code className="rounded bg-surface-container-high px-1">NEXT_PUBLIC_SUPPORT_EMAIL</code> in your environment.
        </p>
      )}
      {phone ? (
        <p className="text-sm">
          <span className="font-medium text-primary">Phone:</span>{" "}
          <a className="underline hover:text-primary" href={`tel:${phone.replace(/\s/g, "")}`}>
            {phone}
          </a>
        </p>
      ) : null}

      <div>
        <label htmlFor="contact-subject" className="mb-1 block text-xs font-bold uppercase tracking-wider text-primary">
          Subject
        </label>
        <input
          id="contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full max-w-md rounded border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor="contact-body" className="mb-1 block text-xs font-bold uppercase tracking-wider text-primary">
          Message
        </label>
        <textarea
          id="contact-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="w-full max-w-lg rounded border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      <button
        type="button"
        onClick={submitMailto}
        className="rounded bg-primary px-8 py-3 text-sm font-bold uppercase tracking-widest text-on-primary hover:opacity-90"
      >
        Open in email app
      </button>
      {status ? <p className="text-xs text-on-surface-variant">{status}</p> : null}
    </div>
  );
}
