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
      "Hi! Time for your daily goals check-in:",
      "",
      "- 10k walking",
      "- Walking after every meal",
      "- 10 pushups",
      "- Plank",
      "- 30 mins brainstorming",
      "",
      "Reply with:",
      '  "yes to all" (if you completed everything)',
      '  "yes to all but walking-10k, pushups" (if you missed some)',
      '  "no to all" (if you missed everything)',
      "",
      "You can also add details like:",
      '  "pushups: 15" (if you did more than 10)',
      '  "plank: 90s" (if you timed it)',
    ].join("\n"),
  });
}

export async function sendWeeklyReminder() {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: process.env.USER_EMAIL!,
    subject: "Weekly Goals Check-in",
    text: [
      "Hi! Time for your weekly goals check-in:",
      "",
      "- Yoga (1x this week)",
      "- Pilates (1x this week)",
      "- Weightlifting (2-3x this week)",
      "",
      "Reply with:",
      '  "yoga: yes, pilates: yes, weightlifting: 3"',
      '  "yes to all but yoga"',
      '  "no to all"',
    ].join("\n"),
  });
}
