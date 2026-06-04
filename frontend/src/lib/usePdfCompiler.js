import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { hasContent } from '@resumex/core';

// ─────────────────────────────────────────────────────────────────────────────
// usePdfCompiler — owns LaTeX→PDF compilation plus a tiny LRU cache of compiled
// blobs, keyed on the exact (template, resume, pageSize, trim) tuple.
//
// The cache is what makes hover pre-rendering worthwhile: `prewarm(id)` compiles
// a template in the background while the user is still deciding, so when they
// actually pick it the finished PDF is already sitting in the cache and swaps in
// instantly instead of after a fresh round-trip + LaTeX compile.
// ─────────────────────────────────────────────────────────────────────────────

// With only a handful of templates this comfortably covers "hover every template
// at the current resume state" plus a little history as the resume changes.
const MAX_CACHE = 12;

const keyFor = (templateId, resume, pageSize, trim) =>
  `${templateId}|${pageSize}|${trim ? 1 : 0}|${JSON.stringify(resume)}`;

export function usePdfCompiler({ resume, templateId, pageSize, trim, retryNonce, debounceMs = 600 }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState(null);

  const cache = useRef(new Map()); // key -> { promise, url?, error? }
  const token = useRef(0);         // guards against a stale compile winning the race
  const activeUrl = useRef(null);  // the URL on screen — eviction must never revoke it
  const prewarmTail = useRef(Promise.resolve()); // serializes background compiles
  const prewarmGen = useRef(0);                  // bumps when a selection preempts the hover queue

  // Reveal a finished URL and remember it as active so eviction leaves it alone.
  const showUrl = useCallback((url) => { activeUrl.current = url; setPdfUrl(url); }, []);

  // Return the cache entry for a tuple, kicking off a compile if none exists.
  // Concurrent callers (a hover and the click that follows) share one promise.
  const compileFor = useCallback((tid, r, ps, tr) => {
    const key = keyFor(tid, r, ps, tr);
    const hit = cache.current.get(key);
    if (hit) { // re-insert to refresh LRU recency
      cache.current.delete(key);
      cache.current.set(key, hit);
      return hit;
    }

    const entry = {};
    entry.promise = (async () => {
      const { latex } = await api.render({ templateId: tid, resume: r, pageSize: ps });
      const blob = await api.compile(latex, { trim: tr });
      entry.url = URL.createObjectURL(blob);
      return entry.url;
    })().catch((e) => {
      entry.error = e;
      // Drop failed entries so a retry (or a later hover) compiles fresh.
      if (cache.current.get(key) === entry) cache.current.delete(key);
      throw e;
    });
    cache.current.set(key, entry);

    // Evict least-recently-used entries past the cap — but never the visible one.
    while (cache.current.size > MAX_CACHE) {
      let removed = false;
      for (const [k, e] of cache.current) {
        if (e.url && e.url === activeUrl.current) continue;
        cache.current.delete(k);
        if (e.url) URL.revokeObjectURL(e.url);
        removed = true;
        break;
      }
      if (!removed) break; // only the active entry is left
    }
    return entry;
  }, []);

  // Background warm-up for a hovered template. Cheap when already cached;
  // otherwise compiles without touching the visible preview. Returns the promise
  // (or null when there's nothing to compile yet) so callers can show a hint.
  //
  // Background compiles are serialized: a burst of hovers must not spawn a pile
  // of concurrent LaTeX jobs (that's what was choking the local engine and
  // failing the occasional request). The active selection still compiles
  // immediately via the effect below — only these speculative warms queue up.
  const prewarm = useCallback((tid) => {
    if (!hasContent(resume)) return null;
    const key = keyFor(tid, resume, pageSize, trim);
    const hit = cache.current.get(key);
    if (hit?.url || hit?.promise) return hit.promise; // already compiled or in flight

    // Snapshot the queue generation. If the user selects a template before this
    // queued warm-up runs, the generation bumps and we skip the compile — the
    // chosen template gets the engine to itself instead of waiting behind hovers.
    const gen = prewarmGen.current;
    const runOrSkip = () => {
      if (prewarmGen.current !== gen) {
        const cached = cache.current.get(key);
        if (cached?.url || cached?.promise) return cached.promise;
        return Promise.reject(new Error('prewarm superseded'));
      }
      return compileFor(tid, resume, pageSize, trim).promise;
    };
    const next = prewarmTail.current.then(runOrSkip, runOrSkip);
    prewarmTail.current = next.then(() => {}, () => {}); // keep the chain alive past failures
    return next;
  }, [resume, pageSize, trim, compileFor]);

  // Compile (or instantly reuse) the active selection whenever inputs change.
  const lastResume = useRef(resume);
  useEffect(() => {
    // Only resume *content* edits should be debounced (they stream in as the
    // user types); switching template / page size / trim is a discrete click
    // and should compile promptly. Either way a short timer still coalesces a
    // rapid flurry of switches into a single compile.
    const resumeChanged = lastResume.current !== resume;
    lastResume.current = resume;

    if (!hasContent(resume)) return;
    const myToken = ++token.current;
    const hit = cache.current.get(keyFor(templateId, resume, pageSize, trim));

    if (hit?.url) { // already compiled (e.g. pre-warmed on hover) — swap in now
      setError(null);
      setCompiling(false);
      showUrl(hit.url);
      return;
    }

    // Compiling the active selection now — preempt any still-queued hover
    // prewarms so the chosen template isn't stuck behind them.
    prewarmGen.current += 1;

    const run = () => {
      setCompiling(true);
      setError(null);
      compileFor(templateId, resume, pageSize, trim).promise
        .then((url) => { if (myToken === token.current) { showUrl(url); setCompiling(false); } })
        .catch((e) => { if (myToken === token.current) { setError(e.message); setCompiling(false); } });
    };

    // An in-flight pre-warm means the user already committed — attach immediately.
    if (hit?.promise) { run(); return; }
    const timer = setTimeout(run, resumeChanged ? debounceMs : 150);
    return () => clearTimeout(timer);
  }, [resume, templateId, pageSize, trim, retryNonce, compileFor, showUrl, debounceMs]);

  // Revoke every cached blob URL when the editor unmounts.
  useEffect(() => () => {
    for (const e of cache.current.values()) if (e.url) URL.revokeObjectURL(e.url);
  }, []);

  return { pdfUrl, compiling, error, prewarm };
}
