export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    "/((?!login|api/auth|api/telegram-webhook|api/send-reminders|_next/static|_next/image|favicon.ico).*)",
  ],
};
