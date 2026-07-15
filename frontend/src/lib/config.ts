// ponytail: satu konstanta, digunakan di seluruh app.
// Ganti ke URL production Render saat deploy.
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
