import { Resend } from "resend";

export {
  parseDailyEmailResponse,
  parseWeeklyEmailResponse,
} from "./parse";

export type {
  ParsedDailyResponse,
  ParsedWeeklyResponse,
} from "./parse";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDailyReminder() {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: process.env.USER_EMAIL!,
    subject: "Daily Goals Check-in",
    text: [
      "Hey! How'd today go?",
      "",
      "- 10k walking",
      "- Walking after meals",
      "- 10 pushups",
      "- Plank",
      "- 30 min brainstorming",
      "",
      "Just reply naturally, like:",
      '  "did everything"',
      '  "only walked after meals today"',
      '  "everything except pushups and plank"',
      '  "skipped 10k and brainstorming"',
      '  "20 pushups, 90s plank"',
      '  "nope"',
    ].join("\n"),
  });
}

export async function sendWeeklyReminder() {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: process.env.USER_EMAIL!,
    subject: "Weekly Goals Check-in",
    text: [
      "Hey! Weekly check-in time:",
      "",
      "- Yoga",
      "- Pilates",
      "- Weightlifting (2-3x)",
      "",
      "Just reply naturally, like:",
      '  "did yoga and pilates, lifted 3 times"',
      '  "only yoga this week"',
      '  "everything except pilates"',
      '  "nope"',
    ].join("\n"),
  });
}
