import { Resend } from "resend";

export type ResendTransactionalParams = {
  apiKey: string;
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
};

export type ResendTransactionalResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

/**
 * Sends one transactional message via Resend and returns structured success or API error text.
 * Callers decide logging, retries, and whether to persist "sent" flags only when ok is true.
 */
export async function sendResendTransactionalEmail(
  params: ResendTransactionalParams,
): Promise<ResendTransactionalResult> {
  const resend = new Resend(params.apiKey);
  const { data, error } = await resend.emails.send({
    from: params.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    ...(params.tags?.length ? { tags: params.tags } : {}),
  });
  if (error) {
    return {
      ok: false,
      message:
        typeof error.message === "string" && error.message.trim()
          ? error.message
          : "Resend returned an error without a message",
    };
  }
  return { ok: true, id: data?.id };
}
