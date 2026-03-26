"use client";

import { useCallback, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Label,
  Textarea,
} from "@apparel-commerce/ui";
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
    const encSub = encodeURIComponent(
      subject || "Maharlika Apparel Custom: Customer inquiry",
    );
    const encBody = encodeURIComponent(body);
    window.location.href = `mailto:${email}?subject=${encSub}&body=${encBody}`;
    setStatus(
      "Your mail app should open. If nothing happens, copy our email from below.",
    );
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
        <Alert variant="destructive">
          <AlertTitle>Email not configured</AlertTitle>
          <AlertDescription className="text-sm">
            Add{" "}
            <code className="rounded bg-surface-container-high px-1">
              NEXT_PUBLIC_SUPPORT_EMAIL
            </code>{" "}
            in your environment.
          </AlertDescription>
        </Alert>
      )}
      {phone ? (
        <p className="text-sm">
          <span className="font-medium text-primary">Phone:</span>{" "}
          <a
            className="underline hover:text-primary"
            href={`tel:${phone.replace(/\s/g, "")}`}
          >
            {phone}
          </a>
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="contact-subject" variant="form">
          Subject
        </Label>
        <Input
          id="contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="max-w-md"
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-body" variant="form">
          Message
        </Label>
        <Textarea
          id="contact-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="max-w-lg"
        />
      </div>
      <Button type="button" onClick={submitMailto} className="uppercase tracking-widest">
        Open in email app
      </Button>
      {status ? (
        <p className="text-xs text-on-surface-variant">{status}</p>
      ) : null}
    </div>
  );
}
