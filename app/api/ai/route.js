import { callClaude, extractText } from '../../../lib/claude';

export async function POST(req) {
  try {
    const { system, messages, max_tokens } = await req.json();
    const response = await callClaude({ system, messages, max_tokens });
    return Response.json({ text: extractText(response) });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
