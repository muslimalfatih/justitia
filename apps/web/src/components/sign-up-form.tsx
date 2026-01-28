import { useForm } from "@tanstack/react-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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
    <div className="mx-auto w-full mt-10 max-w-md p-6">
      <h1 className="mb-6 text-center text-3xl font-bold">Create Account</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error, i) => (
                  <p key={i} className="text-red-500">
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error, i) => (
                  <p key={i} className="text-red-500">
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Password</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error, i) => (
                  <p key={i} className="text-red-500">
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
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
                  <p key={i} className="text-red-500">
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        {/* Lawyer-specific fields */}
        <form.Subscribe selector={(state) => state.values.role}>
          {(role) =>
            role === "lawyer" && (
              <>
                <div>
                  <form.Field name="jurisdiction">
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor={field.name}>Jurisdiction (Optional)</Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          placeholder="e.g., New York, California"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  </form.Field>
                </div>

                <div>
                  <form.Field name="barNumber">
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor={field.name}>Bar Number (Optional)</Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          placeholder="Your bar registration number"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  </form.Field>
                </div>
              </>
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
              {state.isSubmitting ? "Submitting..." : "Sign Up"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-4 text-center">
        <Button
          variant="link"
          onClick={onSwitchToSignIn}
          className="text-indigo-600 hover:text-indigo-800"
        >
          Already have an account? Sign In
        </Button>
      </div>
    </div>
  );
}
