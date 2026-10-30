import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked for safe, consistent output
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Converts a markdown string to sanitised HTML safe for dangerouslySetInnerHTML.
 */
export function renderMarkdown(raw: string): string {
  const parsed = marked.parse(raw);
  // marked.parse can return a Promise if async extensions are registered.
  // We use sync mode, so it returns a string — but guard just in case.
  const html = typeof parsed === 'string' ? parsed : String(parsed ?? '');
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'del', 'ins',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    FORCE_BODY: false,
    RETURN_TRUSTED_TYPE: false,
  });
}
