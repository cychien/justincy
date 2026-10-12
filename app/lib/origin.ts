// Fly terminates TLS at its edge and forwards plain http, so request.url alone reports http.
export function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) url.protocol = `${forwardedProto.split(',')[0].trim()}:`;
  return url.origin;
}
