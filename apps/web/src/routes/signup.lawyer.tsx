import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupLawyer() {
  const navigate = useNavigate();
  const { isPending, data: session } = authClient.useSession();

  // Redirect if already logged in
  if (session) {
    navigate("/lawyer/marketplace");
    return null;
  }

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      name: "",
      jurisdiction: "",
      barNumber: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
          role: "lawyer",
          jurisdiction: value.jurisdiction || undefined,
          barNumber: value.barNumber || undefined,
        } as any,
        {
          onSuccess: () => {
            navigate("/lawyer/marketplace");
            toast.success("Account created successfully!");
          },
          onError: (error) => {
            toast.error(error.error.message || "Sign up failed");
          },
        },
      );
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Lawyer Account</CardTitle>
          <CardDescription>
            Sign up to browse cases and submit quotes for legal work
          </CardDescription>
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
                  <Label htmlFor={field.name}>Full Name *</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="Jane Smith"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="email">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Email *</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    placeholder="lawyer@example.com"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Password *</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    placeholder="••••••••"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                </div>
              )}
            </form.Field>

            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-muted-foreground mb-3">Professional Information (Optional)</p>
              
              <form.Field name="jurisdiction">
                {(field) => (
                  <div className="space-y-2 mb-3">
                    <Label htmlFor={field.name}>Jurisdiction</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="e.g., Singapore, California"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="barNumber">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Bar/Registration Number</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="e.g., 12345"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign In
              </Link>
            </p>
            <p className="mt-2 text-muted-foreground">
              Need legal help?{" "}
              <Link to="/signup/client" className="text-primary hover:underline">
                Sign up as Client
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
