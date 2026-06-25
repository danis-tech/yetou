import { NextResponse } from "next/server";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function created(data: unknown) {
  return NextResponse.json(data, { status: 201 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: "bad_request", message, details }, { status: 400 });
}

export function unauthorized(message = "Authentification requise.") {
  return NextResponse.json({ error: "unauthorized", message }, { status: 401 });
}

export function forbidden(message = "Accès refusé.") {
  return NextResponse.json({ error: "forbidden", message }, { status: 403 });
}

export function notFound(message = "Ressource introuvable.") {
  return NextResponse.json({ error: "not_found", message }, { status: 404 });
}

export function tooManyRequests(message = "Trop de requêtes.") {
  return NextResponse.json({ error: "rate_limited", message }, { status: 429 });
}

export function serverError(message = "Erreur serveur.") {
  return NextResponse.json({ error: "server_error", message }, { status: 500 });
}

export function badGateway(message = "Service externe indisponible.") {
  return NextResponse.json({ error: "bad_gateway", message }, { status: 502 });
}
