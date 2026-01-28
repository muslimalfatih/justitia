import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@justitia/api/context";
import { appRouter } from "@justitia/api/routers/index";
import { auth } from "@justitia/auth";
import { env } from "@justitia/env/server";
import { db, files as filesSchema } from "@justitia/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { uploadFile, handlePaymentWebhook, verifyWebhookSignature, createAuditLog, AuditActions } from "@justitia/services";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization", "stripe-signature"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

// File upload endpoint
app.post("/api/upload", async (c) => {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userRole = (session.user as any).role;
    if (userRole !== "client") {
      return c.json({ error: "Only clients can upload files" }, 403);
    }

    // Parse form data
    const formData = await c.req.formData();
    const caseId = formData.get("caseId") as string;
    const file = formData.get("file") as File;

    if (!caseId || !file) {
      return c.json({ error: "Missing caseId or file" }, 400);
    }

    // Verify case ownership
    // (Add case verification here if needed)

    // Upload file
    const buffer = Buffer.from(await file.arrayBuffer());
    const { storageKey, fileSize } = await uploadFile(
      caseId,
      file.name,
      buffer,
      file.type
    );

    // Save file metadata
    const newFiles = await db
      .insert(filesSchema)
      .values({
        caseId,
        originalFilename: file.name,
        storageKey,
        fileSize,
        mimeType: file.type,
      })
      .returning();

    const newFile = newFiles[0];
    if (!newFile) {
      return c.json({ error: "Failed to save file metadata" }, 500);
    }

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.FILE_UPLOADED,
      resourceType: "file",
      resourceId: newFile.id,
      changes: { caseId, filename: file.name },
    });

    return c.json({ file: newFile });
  } catch (error) {
    console.error("File upload error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      500
    );
  }
});

// Stripe webhook endpoint
app.post("/webhooks/stripe", async (c) => {
  try {
    const body = await c.req.text();
    const signature = c.req.header("stripe-signature");

    if (!signature) {
      return c.json({ error: "Missing signature" }, 400);
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature);

    // Handle the event
    await handlePaymentWebhook(event);

    return c.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      400
    );
  }
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
