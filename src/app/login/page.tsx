"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTelegramClient, saveSession, getSession } from "@/lib/telegram";
import { Api } from "telegram";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code" | "password">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const session = getSession();
      if (session) {
        const client = getTelegramClient(session);
        if (client) {
          try {
            await client.connect();
            const isAuthorized = await client.checkAuthorization();
            if (isAuthorized) {
              router.push("/drive");
            }
          } catch (e) {
            // Keep on login page
          }
        }
      }
    };
    checkSession();
  }, [router]);

  const handleSendCode = async () => {
    setError("");
    setLoading(true);
    try {
      const client = getTelegramClient();
      if (!client) throw new Error("Client not initialized");

      await client.connect();
      const result = await client.sendCode(
        {
          apiId: Number(process.env.NEXT_PUBLIC_TELEGRAM_API_ID),
          apiHash: process.env.NEXT_PUBLIC_TELEGRAM_API_HASH as string,
        },
        phoneNumber
      );

      setPhoneCodeHash(result.phoneCodeHash);
      setStep("code");
    } catch (err: any) {
      setError(err.message || "Failed to send code");
    }
    setLoading(false);
  };

  const handleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const client = getTelegramClient();
      if (!client) throw new Error("Client not initialized");

      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber,
          phoneCodeHash,
          phoneCode,
        })
      );

      saveSession(client.session.save() as unknown as string);
      router.push("/drive");
    } catch (err: any) {
      if (err.message.includes("SESSION_PASSWORD_NEEDED")) {
        setStep("password");
      } else {
        setError(err.message || "Invalid code");
      }
    }
    setLoading(false);
  };

  const handlePasswordSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const client = getTelegramClient();
      if (!client) throw new Error("Client not initialized");

      await client.signInWithPassword({
        apiId: Number(process.env.NEXT_PUBLIC_TELEGRAM_API_ID),
        apiHash: process.env.NEXT_PUBLIC_TELEGRAM_API_HASH as string,
      }, {
        password: () => Promise.resolve(password),
        onError: (err: any) => { throw err; }
      } as any);

      saveSession(client.session.save() as unknown as string);
      router.push("/drive");
    } catch (err: any) {
      setError(err.message || "Invalid password");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md relative overflow-hidden shadow-2xl border-border">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>

        <CardHeader className="flex flex-col items-center pt-8 pb-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-5 border border-primary/20">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome to TeleDrive</CardTitle>
          <CardDescription className="text-center mt-2">
            Log in securely via MTProto to use your private Telegram channel as infinite storage.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm text-center font-medium">
              {error}
            </div>
          )}

          {step === "phone" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                  className="bg-secondary/50 border-white/5 py-6 text-lg"
                />
              </div>
              <Button
                onClick={handleSendCode}
                disabled={loading || !phoneNumber}
                className="w-full py-6 text-base"
              >
                {loading ? "Sending..." : "Send Verification Code"}
              </Button>
            </div>
          )}

          {step === "code" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Telegram Code</label>
                <Input
                  type="text"
                  placeholder="12345"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  disabled={loading}
                  className="bg-secondary/50 border-white/5 py-6 text-center tracking-[0.5em] font-mono text-2xl"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Check your Telegram app for the 5-digit code.
                </p>
              </div>
              <Button
                onClick={handleSignIn}
                disabled={loading || !phoneCode}
                className="w-full py-6 text-base"
              >
                {loading ? "Verifying..." : "Verify & Log In"}
              </Button>
            </div>
          )}

          {step === "password" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Two-Step Verification Password</label>
                <Input
                  type="password"
                  placeholder="Enter your 2FA password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="bg-secondary/50 border-white/5 py-6 text-lg"
                />
              </div>
              <Button
                onClick={handlePasswordSignIn}
                disabled={loading || !password}
                className="w-full py-6 text-base"
              >
                {loading ? "Verifying..." : "Submit Password"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
