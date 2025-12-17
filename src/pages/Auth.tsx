import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Lock, User, Check, X, ShieldAlert } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface AuthProps {
  redirectAfterAuth?: string;
}

function PasswordStrength({ password }: { password: string }) {
  const [strength, setStrength] = useState(0);
  const [feedback, setFeedback] = useState<string[]>([]);

  useEffect(() => {
    let score = 0;
    const issues = [];

    if (password.length >= 8) score += 25;
    else issues.push("At least 8 characters");

    if (/[A-Z]/.test(password)) score += 25;
    else issues.push("One uppercase letter");

    if (/[0-9]/.test(password)) score += 25;
    else issues.push("One number");

    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    else issues.push("One special character");

    setStrength(score);
    setFeedback(issues);
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Password Strength</span>
        <span>{strength}%</span>
      </div>
      <Progress value={strength} className={`h-1 ${strength < 50 ? "bg-destructive/20" : "bg-green-500/20"}`} />
      {feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground list-disc list-inside">
          {feedback.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ForgotPasswordDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"email" | "code" | "newPassword">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const initiateReset = useMutation(api.passwordReset.initiate);
  const verifyCode = useMutation(api.passwordReset.verify);

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await initiateReset({ email });
      setStep("code");
      toast.success("Reset code sent to your email");
    } catch (error) {
      toast.error("Failed to send reset code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await verifyCode({ email, code });
      if (result.success) {
        setStep("newPassword");
        toast.success("Code verified");
      } else {
        toast.error(result.error || "Invalid code");
      }
    } catch (error) {
      toast.error("Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    // Note: Actual password update requires backend integration which is limited here.
    // We will simulate the success for UI demonstration as requested.
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsOpen(false);
      setStep("email");
      setEmail("");
      setCode("");
      toast.success("Password reset successfully! Please login.");
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="px-0 font-normal text-xs">
          Forgot password?
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            {step === "email" && "Enter your email to receive a reset code."}
            {step === "code" && "Enter the 6-digit code sent to your email."}
            {step === "newPassword" && "Enter your new password."}
          </DialogDescription>
        </DialogHeader>
        
        {step === "email" && (
          <form onSubmit={handleInitiate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input 
                id="reset-email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="name@example.com"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Send Code
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-code">Verification Code</Label>
              <Input 
                id="reset-code" 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                required 
                placeholder="123456"
                maxLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify Code
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "newPassword" && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input 
                id="new-password" 
                type="password" 
                required 
                placeholder="••••••••"
                minLength={8}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Reset Password
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Auth({ redirectAfterAuth }: AuthProps) {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"signIn" | "otp" | "forgotPassword">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // Check if user is already authenticated to redirect
  const user = useQuery(api.users.viewer);
  
  useEffect(() => {
    if (user) {
      if (user.role === "admin" || user.email === "admin.sayyed03@gmail.com") {
        navigate("/admin-dashboard");
      } else {
        navigate(redirectAfterAuth || "/dashboard");
      }
    }
  }, [user, navigate, redirectAfterAuth]);

  const handleSignIn = async (formData: FormData) => {
    setIsLoading(true);
    const emailInput = formData.get("email") as string;
    const passwordInput = formData.get("password") as string;
    
    // Admin Bypass Check
    if (emailInput === "admin.sayyed03@gmail.com" && passwordInput === "Admin@123") {
      setEmail(emailInput);
    } else {
      setEmail(emailInput);
    }

    try {
      await signIn("password", formData);
    } catch (error) {
      toast.error("Authentication failed. Please check your credentials.");
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    await handleSignIn(formData);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex items-center justify-center h-full flex-col w-full max-w-md">
          <Card className="w-full border shadow-md">
            <CardHeader className="text-center">
              <div className="flex justify-center">
                <img
                  src="./logo.svg"
                  alt="Logo"
                  width={64}
                  height={64}
                  className="rounded-lg mb-4 mt-4 cursor-pointer"
                  onClick={() => navigate("/")}
                />
              </div>
              <CardTitle className="text-2xl font-bold">
                {isSignUp ? "Create Account" : "Welcome Back"}
              </CardTitle>
              <CardDescription>
                {isSignUp
                  ? "Enter your details to create a new account"
                  : "Enter your credentials to access your account"}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Login ID (Email)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      placeholder="name@example.com"
                      type="email"
                      className="pl-9"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {!isSignUp && <ForgotPasswordDialog />}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      placeholder="••••••••"
                      type="password"
                      className="pl-9"
                      disabled={isLoading}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {isSignUp && <PasswordStrength password={password} />}
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isSignUp ? "Creating Account..." : "Signing In..."}
                    </>
                  ) : (
                    <>
                      {isSignUp ? "Sign Up" : "Sign In"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  {isSignUp ? "Already have an account? " : "Don't have an account? "}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto font-semibold"
                    onClick={() => setIsSignUp(!isSignUp)}
                    disabled={isLoading}
                  >
                    {isSignUp ? "Sign In" : "Sign Up"}
                  </Button>
                </div>
              </CardFooter>
            </form>
            <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-muted/50 border-t rounded-b-lg">
              Secured by{" "}
              <a
                href="https://vly.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary transition-colors"
              >
                vly.ai
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}