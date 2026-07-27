// CSS sanitizer for user-provided custom CSS
// Strips dangerous properties, URLs, expressions, and injection vectors.
// Uses a whitelist approach with property-level checks.

const ALLOWED_PROPERTIES = new Set([
  // Color / background
  'color', 'background-color', 'background',
  // Typography
  'font-family', 'font-size', 'font-weight', 'font-style',
  'text-align', 'text-decoration', 'text-transform', 'line-height',
  'letter-spacing', 'word-spacing',
  // Box model
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-radius', 'border-color', 'border-style', 'border-width',
  'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height',
  'overflow', 'overflow-x', 'overflow-y',
  // Positioning
  'position', 'top', 'right', 'bottom', 'left', 'z-index',
  'float', 'clear', 'display', 'visibility', 'opacity',
  // Flex / grid
  'flex', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink',
  'justify-content', 'align-items', 'align-content', 'gap',
  'grid-template-columns', 'grid-template-rows', 'grid-gap',
  // Effects
  'box-shadow', 'text-shadow', 'filter', 'backdrop-filter',
  'transition', 'transition-property', 'transition-duration',
  'transition-timing-function', 'transition-delay',
  'transform', 'transform-origin',
  // Cursor / interaction
  'cursor', 'user-select', 'pointer-events',
  // Misc safe
  'list-style', 'list-style-type', 'outline', 'outline-color',
  'outline-style', 'outline-width', 'outline-offset',
  'accent-color', 'caret-color', 'scroll-behavior',
  // Content
  'content',
]);

const ALLOWED_PSEUDO_CLASSES = new Set([
  ':hover', ':active', ':focus', ':focus-visible',
  ':nth-child', ':first-child', ':last-child', ':nth-of-type',
  ':only-child', ':empty',
]);

const ALLOWED_PSEUDO_ELEMENTS = new Set([
  '::before', '::after', '::placeholder', '::selection',
  '::-webkit-scrollbar', '::-webkit-scrollbar-track', '::-webkit-scrollbar-thumb',
]);

const DANGEROUS_PATTERNS = [
  /url\s*\(/gi,
  /expression\s*\(/gi,
  /javascript\s*:/gi,
  /data\s*:/gi,
  /@import/gi,
  /@font-face/gi,
  /@keyframes/gi,
  /@media/gi,
  /@supports/gi,
  /@layer/gi,
  /@page/gi,
  /behavior\s*:/gi,
  /-moz-binding/gi,
  /expression/gi,
  /chrome\s*:/gi,
  /resource\s*:/gi,
  /\\0/gi,
  /\\x0/gi,
  /<!--/g,
  /-->/g,
  /<script/gi,
  /<iframe/gi,
  /on\w+\s*=/gi,
  /expression\s*\(/gi,
  /attr\s*\(/gi,
];

export function sanitizeCSS(css: string, maxSize = 10000): string {
  if (!css) return '';
  if (css.length > maxSize) {
    css = css.slice(0, maxSize);
  }

  let sanitized = css;

  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  const lines = sanitized.split('\n');
  const result: string[] = [];
  let currentSelector = '';
  let inBlock = false;
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    if (line.includes('{')) {
      const selectorPart = line.split('{')[0].trim();
      if (selectorPart && !isSelectorSafe(selectorPart)) {
        line = line.replace(selectorPart, '');
      }
      currentSelector = selectorPart;
      inBlock = true;
      depth++;
    }

    if (inBlock && line.includes(':')) {
      const colonIndex = line.indexOf(':');
      const prop = line.slice(0, colonIndex).trim().toLowerCase();
      if (prop && !ALLOWED_PROPERTIES.has(prop)) {
        line = '';
      }
    }

    if (line.includes('}')) {
      depth--;
      if (depth <= 0) {
        inBlock = false;
        depth = 0;
      }
    }

    if (line) {
      result.push(line);
    }
  }

  let final = result.join('\n');

  for (const pattern of DANGEROUS_PATTERNS) {
    final = final.replace(pattern, '');
  }

  if (final.length > maxSize) {
    final = final.slice(0, maxSize);
  }

  return final;
}

function isSelectorSafe(selector: string): boolean {
  if (!selector) return false;

  if (DANGEROUS_PATTERNS.some(p => p.test(selector))) {
    return false;
  }

  if (selector.includes('script') ||
      selector.includes('iframe') ||
      selector.includes('onload') ||
      selector.includes('onerror')) {
    return false;
  }

  if (selector.includes('@')) {
    return false;
  }

  if (selector.includes('expression') ||
      selector.includes('javascript:') ||
      selector.includes('url(')) {
    return false;
  }

  return true;
}

export function buildScopedCSS(css: string, scopeSelector: string): string {
  const sanitized = sanitizeCSS(css);
  if (!sanitized) return '';

  const scoped: string[] = [];
  const blocks = sanitized.split('}');

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const parts = trimmed.split('{');
    if (parts.length < 2) continue;

    let selector = parts[0].trim();
    const body = parts.slice(1).join('{').trim();

    if (!selector || !body) continue;

    const selectors = selector.split(',').map(s => s.trim());
    const scopedSelectors = selectors.map(s => {
      if (s.startsWith('::') || s.startsWith(':')) {
        return `${scopeSelector}${s}`;
      }
      return `${scopeSelector} ${s}`;
    });

    scoped.push(`${scopedSelectors.join(', ')} { ${body} }`);
  }

  return scoped.join('\n');
}
