import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const BASE_URL = "https://consultor.saas.digitro.cloud";
const LOGIN = "pesto";
const PASSWORD = "Aa123456";

interface RequestLog {
  step: string;
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody: unknown;
  responseStatus: number;
  responseStatusText: string;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
  durationMs: number;
  timestamp: string;
}

const requestLogs: RequestLog[] = [];

function sha512(data: string): string {
  return crypto.createHash("sha512").update(data).digest("hex");
}

async function loggedFetch(
  step: string,
  url: string,
  options: RequestInit & { body?: string | FormData }
): Promise<{ response: Response; log: RequestLog }> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Capture request headers
  const requestHeaders: Record<string, string> = {};
  if (options.headers) {
    const headers = options.headers as Record<string, string>;
    Object.entries(headers).forEach(([key, value]) => {
      requestHeaders[key] = value;
    });
  }

  // Capture request body
  let requestBody: unknown = null;
  if (options.body) {
    if (typeof options.body === "string") {
      try {
        requestBody = JSON.parse(options.body);
      } catch {
        requestBody = options.body;
      }
    } else if (options.body instanceof FormData) {
      const formDataObj: Record<string, unknown> = {};
      options.body.forEach((value, key) => {
        if (value instanceof File) {
          formDataObj[key] = {
            type: "File",
            name: value.name,
            size: value.size,
            mimeType: value.type,
          };
        } else {
          try {
            formDataObj[key] = JSON.parse(value as string);
          } catch {
            formDataObj[key] = value;
          }
        }
      });
      requestBody = formDataObj;
    }
  }

  const response = await fetch(url, options);
  const durationMs = Date.now() - startTime;

  // Capture response headers
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  // Clone response to read body without consuming it
  const responseClone = response.clone();
  let responseBody: unknown;
  try {
    const text = await responseClone.text();
    try {
      responseBody = JSON.parse(text);
    } catch {
      responseBody = text;
    }
  } catch {
    responseBody = "[Unable to read response body]";
  }

  const log: RequestLog = {
    step,
    url,
    method: options.method || "GET",
    requestHeaders,
    requestBody,
    responseStatus: response.status,
    responseStatusText: response.statusText,
    responseHeaders,
    responseBody,
    durationMs,
    timestamp,
  };

  requestLogs.push(log);

  return { response, log };
}

async function authenticate(logs: RequestLog[]): Promise<string> {
  // Step 1: Get challenge
  const { response: loginResponse } = await loggedFetch(
    "1. Get Authentication Challenge",
    `${BASE_URL}/una/auth/v1/integration/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ login: LOGIN }),
    }
  );
  logs.push(requestLogs[requestLogs.length - 1]);

  const loginData = await loginResponse.json();
  const challenge = loginData.challenge;

  if (!challenge) {
    throw new Error(`Failed to get challenge: ${JSON.stringify(loginData)}`);
  }

  // Step 2: Create hashes
  const initialHash = sha512(LOGIN + PASSWORD);
  const responseHash = sha512(challenge + initialHash);

  // Step 3: Complete challenge
  const { response: challengeResponse } = await loggedFetch(
    "2. Complete Authentication Challenge",
    `${BASE_URL}/una/auth/v1/integration/challenge`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        login: LOGIN,
        challenge: challenge,
        response: responseHash,
      }),
    }
  );
  logs.push(requestLogs[requestLogs.length - 1]);

  if (!challengeResponse.ok) {
    throw new Error(`Failed to complete challenge: ${challengeResponse.status}`);
  }

  // Extract token from cookies
  const setCookieHeader = challengeResponse.headers.get("set-cookie");
  if (!setCookieHeader) {
    throw new Error("No authentication cookie received");
  }

  const tokenMatch = setCookieHeader.match(/__iunasid=([^;]+)/);
  if (!tokenMatch) {
    throw new Error("Token not found in cookies");
  }

  return tokenMatch[1];
}

async function sendTextMessage(token: string, userId: string, message: string, logs: RequestLog[]) {
  const messageId = crypto.randomUUID();

  const { response } = await loggedFetch(
    "3. Send Text Message",
    `${BASE_URL}/una/history/v1/chatMessages`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Cookie: `__iunasid=${token};`,
      },
      body: JSON.stringify({
        chatMessage: {
          id: messageId,
          chat: userId,
          text: message,
        },
      }),
    }
  );
  logs.push(requestLogs[requestLogs.length - 1]);

  if (!response.ok) {
    throw new Error("Falha ao enviar mensagem");
  }

  return response.json();
}

async function sendFileMessage(token: string, userId: string, file: File, messageText: string | null, logs: RequestLog[]) {
  const messageId = crypto.randomUUID();
  const unaFormData = new FormData();

  // Build chatMessage - can include text with file attachment
  const chatMessage: { id: string; to: string; text?: string } = {
    id: messageId,
    to: userId,
  };

  // Add text if provided (documentation shows this is supported)
  if (messageText && messageText.trim()) {
    chatMessage.text = messageText.trim();
  }

  // Order matters: file first, then chatMessage (per documentation example)
  unaFormData.append("file", file);
  unaFormData.append("chatMessage", JSON.stringify(chatMessage));

  const { response } = await loggedFetch(
    messageText ? "3. Send File with Message" : "3. Send File Attachment",
    `${BASE_URL}/una/history/v1/chatMessages/attachment`,
    {
      method: "POST",
      headers: {
        Cookie: `__iunasid=${token};`,  // Trailing semicolon per documentation
      },
      body: unaFormData,
    }
  );
  logs.push(requestLogs[requestLogs.length - 1]);

  if (!response.ok) {
    throw new Error("Falha ao enviar arquivo");
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  // Clear previous logs
  requestLogs.length = 0;
  const logs: RequestLog[] = [];
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;
    const message = formData.get("message") as string | null;

    if (!userId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID do usuário é obrigatório",
          logs,
          totalDurationMs: Date.now() - startTime,
        },
        { status: 400 }
      );
    }

    const hasFile = file && file.size > 0;
    const hasMessage = message && message.trim().length > 0;

    if (!hasFile && !hasMessage) {
      return NextResponse.json(
        {
          success: false,
          error: "Envie pelo menos um arquivo ou uma mensagem",
          logs,
          totalDurationMs: Date.now() - startTime,
        },
        { status: 400 }
      );
    }

    // Authenticate with UNA
    const token = await authenticate(logs);

    const results: { textResult?: unknown; fileResult?: unknown } = {};

    // If we have a file, send file (with optional message embedded)
    if (hasFile) {
      // When sending file, we can include the message text in the same request
      results.fileResult = await sendFileMessage(
        token,
        userId.trim(),
        file,
        hasMessage ? message.trim() : null,
        logs
      );
    } else if (hasMessage) {
      // Only send standalone text message if there's no file
      results.textResult = await sendTextMessage(token, userId.trim(), message.trim(), logs);
    }

    return NextResponse.json({
      success: true,
      message: hasFile && hasMessage
        ? "Arquivo e mensagem enviados com sucesso"
        : hasFile
          ? "Arquivo enviado com sucesso"
          : "Mensagem enviada com sucesso",
      data: results,
      logs,
      totalDurationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Error sending:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno do servidor",
        logs,
        totalDurationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
