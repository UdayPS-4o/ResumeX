// Robust partial JSON parser that handles incomplete JSON strings from LLM streaming.
export function parsePartialJson(jsonString) {
  let s = jsonString.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '');
  }
  s = s.replace(/```$/i, '').trim();

  if (!s) return null;

  // Try parsing directly first
  try {
    return JSON.parse(s);
  } catch (e) {}

  // Balanced braces/brackets logic
  let state = 'normal'; // 'normal' | 'string' | 'escape'
  const stack = [];
  let parsed = '';

  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    if (state === 'escape') {
      parsed += char;
      state = 'string';
    } else if (state === 'string') {
      if (char === '\\') {
        state = 'escape';
        parsed += char;
      } else if (char === '"') {
        state = 'normal';
        parsed += char;
      } else {
        parsed += char;
      }
    } else {
      if (char === '"') {
        state = 'string';
        parsed += char;
      } else if (char === '{') {
        stack.push('}');
        parsed += char;
      } else if (char === '[') {
        stack.push(']');
        parsed += char;
      } else if (char === '}') {
        if (stack.length && stack[stack.length - 1] === '}') {
          stack.pop();
        }
        parsed += char;
      } else if (char === ']') {
        if (stack.length && stack[stack.length - 1] === ']') {
          stack.pop();
        }
        parsed += char;
      } else {
        parsed += char;
      }
    }
  }

  // If we're stuck in a string, close the string quote
  if (state === 'string' || state === 'escape') {
    parsed += '"';
  }

  // We now have some valid prefix and maybe some trailing incomplete parts.
  // E.g., `{"name": "John", "age": ` or `{"experience": [`
  // Let's recursively try to parse by cleaning up the trailing parts.
  let currentTry = parsed;
  while (currentTry.length > 0) {
    // Generate the closed version of currentTry
    const closedStr = currentTry + [...stack].reverse().join('');
    try {
      return JSON.parse(closedStr);
    } catch (err) {}

    // If it failed, strip the last character from currentTry.
    const lastChar = currentTry[currentTry.length - 1];
    currentTry = currentTry.slice(0, -1);
    if (lastChar === '{') {
      stack.pop();
    } else if (lastChar === '[') {
      stack.pop();
    } else if (lastChar === '}') {
      stack.push('}');
    } else if (lastChar === ']') {
      stack.push(']');
    }
  }

  return null;
}
