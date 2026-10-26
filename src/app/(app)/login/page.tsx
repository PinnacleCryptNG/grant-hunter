import type { Metadata } from "next";
import { LoginView } from "@/components/LoginView";

export const metadata: Metadata = { title: "Sign in · Grant Hunter" };

export default function LoginPage() {
  return <LoginView />;
}
