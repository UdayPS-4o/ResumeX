import { Router } from 'express';
import { complete, streamComplete } from '../providers/index.js';
import { buildSystemPrompt, buildImportPrompt, RESUME_DELIM } from '../prompts/builder.js';
import { emptyResume, mergeResume } from '../schema.js';

const router = Router();

// POST /api/chat
// body: { provider, model, apiKey, messages, resume }
// Non-streaming — returns { message, resume }.
router.post('/', async (req, res, next) => {
  try {
    const { provider, model, apiKey, messages = [], resume = emptyResume(), temperature, imported } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      const err = new Error('messages array required');
      err.status = 400;
      throw err;
    }

    // Verbatim imports use a coach-free parser prompt + greedy decoding so the
    // model transcribes rather than "improves" the résumé.
    const system = imported ? buildImportPrompt(resume) : buildSystemPrompt(resume);
    const temp = imported ? 0 : temperature;
    const { text } = await complete({ provider, model, apiKey, system, messages, temperature: temp });
    const { message, resumeJson } = splitResponse(text);
    const updated = resumeJson ? mergeResume(resume, resumeJson) : resume;
    res.json({ message: message || text.slice(0, 1000), resume: updated, patch: resumeJson || null });
  } catch (e) {
    next(e);
  }
});

// POST /api/chat/stream
// Same body. Streams Server-Sent Events:
//   event: delta  data: {"text": "..."}     (message text, incrementally)
//   event: final  data: {"resume": {...}}   (parsed resume once complete)
//   event: error  data: {"error": "..."}
router.post('/stream', async (req, res) => {
  const { provider, model, apiKey, messages = [], resume = emptyResume() } = req.body || {};

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw Object.assign(new Error('messages array required'), { status: 400 });
    }

    const system = buildSystemPrompt(resume);
    const stream = streamComplete({ provider, model, apiKey, system, messages });

    let buffer = '';        // full accumulated raw output
    let emittedLen = 0;     // how much of the message we've already sent
    let delimHit = false;

    for await (const chunk of stream) {
      buffer += chunk;

      if (!delimHit) {
        const idx = buffer.indexOf(RESUME_DELIM);
        if (idx === -1) {
          // Hold back a tail that might be a partial delimiter, so we never
          // flash part of "<<<RESUME_JSON>>>" to the user.
          const safeLen = Math.max(0, buffer.length - RESUME_DELIM.length);
          if (safeLen > emittedLen) {
            send('delta', { text: buffer.slice(emittedLen, safeLen) });
            emittedLen = safeLen;
          }
        } else {
          // Emit the remainder of the message up to the delimiter, then stop.
          if (idx > emittedLen) send('delta', { text: buffer.slice(emittedLen, idx) });
          emittedLen = idx + RESUME_DELIM.length;
          delimHit = true;
        }
      } else {
        const chunkToEmit = buffer.slice(emittedLen);
        if (chunkToEmit.length > 0) {
          send('patch-delta', { text: chunkToEmit });
          emittedLen = buffer.length;
        }
      }
    }

    const { message, resumeJson } = splitResponse(buffer);
    // Flush any message tail we held back (e.g. no delimiter ever arrived).
    if (!delimHit && message.length > emittedLen) {
      send('delta', { text: message.slice(emittedLen) });
    }

    const updated = resumeJson ? mergeResume(resume, resumeJson) : resume;
    // patch = the raw section delta the model proposed. The client uses it to
    // build an "Insert" suggestion and to re-merge against the live resume,
    // rather than blindly overwriting (which would clobber interim edits).
    send('final', { resume: updated, message, patch: resumeJson || null });
    res.end();
  } catch (e) {
    send('error', { error: e.message || 'stream failed' });
    res.end();
  }
});

// Split "<message>\n<<<RESUME_JSON>>>\n{json}" into parts. Tolerant of the model
// omitting the delimiter or wrapping JSON in fences.
function splitResponse(text) {
  if (!text) return { message: '', resumeJson: null };
  const idx = text.indexOf(RESUME_DELIM);
  if (idx === -1) {
    // Maybe the model returned the old {message, resume} JSON shape — try that.
    const obj = parseJsonLoose(text);
    if (obj && (obj.message || obj.resume)) {
      return { message: obj.message || '', resumeJson: obj.resume || null };
    }
    return { message: text.trim(), resumeJson: null };
  }
  const message = text.slice(0, idx).trim();
  const jsonPart = text.slice(idx + RESUME_DELIM.length);
  return { message, resumeJson: parseJsonLoose(jsonPart) };
}

function parseJsonLoose(text) {
  if (!text) return null;
  let s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(s); } catch {}
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  try { return JSON.parse(s.slice(first, last + 1)); } catch { return null; }
}

export default router;
