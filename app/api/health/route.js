export const runtime = 'nodejs';

export async function GET() {
  return Response.json({
    status: 'ok',
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    time: new Date().toISOString(),
  });
}
