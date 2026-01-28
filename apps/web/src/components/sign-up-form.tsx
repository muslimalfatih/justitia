import { useForm } from "@tanstack/react-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import z from "zod";
import { UserPlus, Mail, Lock, User, Briefcase, ArrowRight, MapPin, Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export default function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const navigate = useNavigate();
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "client" as "client" | "lawyer",
      jurisdiction: "",
      barNumber: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
          role: value.role,
          jurisdiction: value.role === "lawyer" ? value.jurisdiction : undefined,
          barNumber: value.role === "lawyer" ? value.barNumber : undefined,
        } as any,
        {
          onSuccess: () => {
            const redirectPath = value.role === "client" ? "/client/dashboard" : "/lawyer/marketplace";
            navigate(redirectPath);
            toast.success("Sign up successful");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-2">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>Join Justitia today</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              <form.Field name="name">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id={field.name}
                        name={field.name}
                        placeholder="John Doe"
                        className="pl-9"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                    {field.state.meta.errors.map((error, i) => (
                      <p key={i} className="text-sm text-destructive">
                        {String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="email">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        placeholder="you@example.com"
                        className="pl-9"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                    {field.state.meta.errors.map((error, i) => (
                      <p key={i} className="text-sm text-destructive">
                        {String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="password">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id={field.name}
                        name={field.name}
                        type="password"
                        placeholder="••••••••"
                        className="pl-9"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                    {field.state.meta.errors.map((error, i) => (
                      <p key={i} className="text-sm text-destructive">
                        {String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="role">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>I am a</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => value && field.handleChange(value as "client" | "lawyer")}
                    >
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client - I need legal help</SelectItem>
                        <SelectItem value="lawyer">Lawyer - I provide legal services</SelectItem>
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.map((error, i) => (
                      <p key={i} className="text-sm text-destructive">
                        {String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              {/* Lawyer-specific fields */}
              <form.Subscribe selector={(state) => state.values.role}>
                {(role) =>
                  role === "lawyer" && (
                    <div className="space-y-4">
                      <form.Field name="jurisdiction">
                        {(field) => (
                          <div className="space-y-2">
                            <Label htmlFor={field.name}>Jurisdiction (Optional)</Label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id={field.name}
                                name={field.name}
                                placeholder="e.g., New York, California"
                                className="pl-9"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </form.Field>

                      <form.Field name="barNumber">
                        {(field) => (
                          <div className="space-y-2">
                            <Label htmlFor={field.name}>Bar Number (Optional)</Label>
                            <div className="relative">
                              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id={field.name}
                                name={field.name}
                                placeholder="Your bar registration number"
                                className="pl-9"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </form.Field>
                    </div>
                  )
                }
              </form.Subscribe>

              <form.Subscribe>
                {(state) => (
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!state.canSubmit || state.isSubmitting}
                  >
                    {state.isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={onSwitchToSignIn}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
