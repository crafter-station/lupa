import { createHmac, timingSafeEqual } from "node:crypto";

interface InternalTokenPayload {
  iss: string;
  projectId: string;
  exp: number;
}

export function generateInternalToken(projectId: string): string {
  const payload: InternalTokenPayload = {
    iss: "lupa-internal",
    projectId,
    exp: Date.now() + 5000,
  };

  const payloadStr = JSON.stringify(payload);
  const secret = process.env.INTERNAL_REQUEST_SECRET;

  if (!secret) {
    throw new Error("INTERNAL_REQUEST_SECRET is not configured");
  }

  const signature = createHmac("sha256", secret)
    .update(payloadStr)
    .digest("hex");

  return Buffer.from(`${payloadStr}.${signature}`).toString("base64");
}

export function verifyInternalToken(
  token: string,
  expectedProjectId: string,
): boolean {
  try {
    const secret = process.env.INTERNAL_REQUEST_SECRET;

    if (!secret) {
      return false;
    }

    const decoded = Buffer.from(token, "base64").toString();
    const [payloadStr, signature] = decoded.split(".");

    if (!payloadStr || !signature) {
      return false;
    }

    const payload: InternalTokenPayload = JSON.parse(payloadStr);

    if (payload.exp < Date.now()) {
      return false;
    }

    if (payload.projectId !== expectedProjectId) {
      return false;
    }

    if (payload.iss !== "lupa-internal") {
      return false;
    }

    const expectedSig = createHmac("sha256", secret)
      .update(payloadStr)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature, "utf-8");
    const expectedSigBuffer = Buffer.from(expectedSig, "utf-8");

    if (signatureBuffer.length !== expectedSigBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedSigBuffer);
  } catch {
    return false;
  }
}
