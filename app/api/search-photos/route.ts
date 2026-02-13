import { NextRequest, NextResponse } from "next/server";

const JANUS_URL =
  "https://janus-intranet-service-795622576125.southamerica-east1.run.app";
const API_KEY = "jns_internal_vjSnfn3kmlhovmIuOLdef5IzMpnHBqPGNfvN1OJQ";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "O parâmetro 'name' é obrigatório" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${JANUS_URL}/employee/photo?name=${encodeURIComponent(name.trim())}`,
      {
        headers: {
          "X-API-Key": API_KEY,
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Erro do serviço Janus: ${response.status}`, details: text },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error searching photos:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}
