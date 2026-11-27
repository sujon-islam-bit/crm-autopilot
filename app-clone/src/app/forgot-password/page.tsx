import { Suspense } from "react";
import ForgotPasswordClient from "./ForgotPasswordClient";

export const metadata = { title: "Reset your password · Vouchso" };

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordClient />
    </Suspense>
  );
}
