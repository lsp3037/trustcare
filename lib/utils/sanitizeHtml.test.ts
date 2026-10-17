import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';

describe('Sanitização de HTML e Prevenção de XSS (F-22)', () => {
  it('deve remover tags <script> maliciosas', () => {
    const dirty = '<p>Aparelho não liga</p><script>alert("xss")</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('alert');
    expect(clean).toContain('<p>Aparelho não liga</p>');
  });

  it('deve remover manipuladores de eventos inline (onerror, onload, onclick)', () => {
    const dirty = '<img src="x" onerror="alert(1)" /><p onclick="alert(2)">Texto</p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('alert');
  });

  it('deve remover iframes, objects e embeds maliciosos', () => {
    const dirty = '<iframe src="http://evil.com"></iframe><embed src="evil.swf"></embed>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<iframe');
    expect(clean).not.toContain('<embed');
  });

  it('deve neutralizar URLs com javascript:', () => {
    const dirty = '<a href="javascript:alert(1)">Clique aqui</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('javascript:');
  });

  it('deve preservar formatação segura de texto rico do editor Quill', () => {
    const safeHtml = '<p>Troca de tela <strong>concluída</strong> com <em>sucesso</em>.</p><ul><li>Limpeza interna</li><li>Pasta térmica</li></ul>';
    const clean = sanitizeHtml(safeHtml);
    expect(clean).toContain('<p>');
    expect(clean).toContain('<strong>concluída</strong>');
    expect(clean).toContain('<em>sucesso</em>');
    expect(clean).toContain('<ul>');
    expect(clean).toContain('<li>Limpeza interna</li>');
  });

  it('deve retornar string vazia para valores nulos, indefinidos ou vazios', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });
});
