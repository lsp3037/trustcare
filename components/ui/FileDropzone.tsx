'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, Film, FileText, Eye, Trash2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './LoadingSpinner';
import { Modal } from './Modal';

export interface DropzoneFile {
  file?: File;
  name: string;
  url: string;
  type?: string;
  category?: 'problem' | 'service';
  persistentUrl?: string;
}

export type MediaFileItem = DropzoneFile;

export interface FileDropzoneProps {
  /** Lista de arquivos / mídias já anexados. */
  files?: DropzoneFile[];
  /** Callback acionado ao selecionar ou soltar novos arquivos. Aceita FileList ou File[]. */
  onFilesSelected: (files: File[]) => void;
  /** Callback acionado ao solicitar remoção de um anexo por índice. */
  onRemoveFile?: (index: number) => void;
  /** Estado de envio / carregamento ativo. */
  loading?: boolean;
  /** Desabilita interações. */
  disabled?: boolean;
  /** Tipos MIME aceitos (ex: "image/*,video/*"). */
  accept?: string;
  /** Se permite múltiplos arquivos simultâneos. Padrão: true. */
  multiple?: boolean;
  /** Tamanho máximo permitido em MB por arquivo. Padrão: 15. */
  maxSizeMB?: number;
  /** Título principal da área de arraste. */
  title?: string;
  /** Subtítulo com formatos e limitações. */
  subtitle?: string;
  /** Rótulo ou badge contextual (ex: "Fotos de Entrada", "Apenas Técnicos"). */
  badge?: string;
  /** Modo compacto para áreas laterais ou seções menores. */
  compact?: boolean;
  /** Classes CSS adicionais para o contêiner raiz. */
  className?: string;
  /** Desativa o botão de remoção e a área de upload (apenas visualização). */
  readOnly?: boolean;
}

export function FileDropzone({
  files = [],
  onFilesSelected,
  onRemoveFile,
  loading = false,
  disabled = false,
  accept = 'image/*,video/*',
  multiple = true,
  maxSizeMB = 15,
  title = 'Arraste fotos ou vídeos aqui, ou clique para selecionar',
  subtitle = 'JPG, PNG, WebP ou MP4 até 15MB',
  badge,
  compact = false,
  className,
  readOnly = false,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [previewItem, setPreviewItem] = useState<DropzoneFile | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const filterAndEmitFiles = (incoming: File[]) => {
    setValidationError(null);
    const validFiles: File[] = [];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    for (const f of incoming) {
      if (f.size > maxSizeBytes) {
        setValidationError(`O arquivo "${f.name}" excede o limite de ${maxSizeMB}MB.`);
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0 && !disabled && !readOnly) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    if (disabled || readOnly || loading) return;

    const filesSource = e.dataTransfer?.files;

    if (filesSource && filesSource.length > 0) {
      const droppedFiles = Array.from(filesSource);
      filterAndEmitFiles(droppedFiles);
      try {
        e.dataTransfer.clearData?.();
      } catch {}
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      filterAndEmitFiles(selected);
      e.target.value = '';
    }
  };

  const handleTriggerClick = () => {
    if (disabled || readOnly || loading) return;
    inputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || readOnly || loading) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div className={cn('space-y-3 w-full', className)}>
      {/* Header com badge opcional se fornecido */}
      {badge && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-caption uppercase tracking-wider text-text-subtle font-semibold">
            {badge}
          </span>
          {files.length > 0 && (
            <span className="text-caption text-text-muted">
              {files.length} {files.length === 1 ? 'anexo' : 'anexos'}
            </span>
          )}
        </div>
      )}

      {/* Área interativa de Dropzone */}
      {!readOnly && (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={handleTriggerClick}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label={title}
          aria-disabled={disabled || loading}
          className={cn(
            'group relative flex flex-col items-center justify-center text-center cursor-pointer select-none transition-all duration-200',
            'rounded-[20px] border-2 border-dashed',
            compact ? 'p-4 gap-2 min-h-[100px]' : 'p-6 sm:p-8 gap-3 min-h-[140px]',
            isDragging
              ? 'border-brand bg-brand/10 shadow-[0_0_24px_rgba(16,185,129,0.18)] scale-[1.01]'
              : 'border-glass-border bg-glass/60 hover:bg-glass hover:border-glass-border-strong backdrop-blur-xl',
            (disabled || loading) && 'opacity-60 cursor-not-allowed pointer-events-none',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled || loading}
            onChange={handleInputChange}
            className="sr-only"
            tabIndex={-1}
          />

          <div
            className={cn(
              'rounded-2xl flex items-center justify-center transition-all duration-300',
              compact ? 'w-10 h-10' : 'w-12 h-12',
              isDragging
                ? 'bg-brand text-brand-contrast scale-110'
                : 'bg-brand/15 text-brand group-hover:scale-105 group-hover:bg-brand/20'
            )}
          >
            {loading ? (
              <LoadingSpinner className="w-5 h-5 text-brand" />
            ) : (
              <UploadCloud className="w-6 h-6" strokeWidth={1.8} aria-hidden />
            )}
          </div>

          <div className="space-y-1 max-w-md">
            <p className={cn('font-semibold text-text', compact ? 'text-small' : 'text-body')}>
              {loading ? 'Processando mídias...' : isDragging ? 'Solte os arquivos aqui' : title}
            </p>
            {subtitle && (
              <p className="text-caption text-text-subtle font-mono">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Alerta de validação */}
      {validationError && (
        <div
          role="alert"
          className="p-3 bg-danger/10 border border-danger/25 text-danger rounded-xl text-small"
        >
          {validationError}
        </div>
      )}

      {/* Grid de Miniaturas dos Arquivos Anexados */}
      {files.length > 0 && (
        <div className="space-y-2 pt-1">
          <ul
            className={cn(
              'grid gap-3',
              compact
                ? 'grid-cols-2 sm:grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
            )}
          >
            {files.map((media, idx) => {
              const isImage = media.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(media.name);
              const isVideo = media.type?.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(media.name);

              return (
                <li
                  key={`${media.name}-${idx}`}
                  className="group relative bg-surface-sunken overflow-hidden rounded-xl border border-glass-border hover:border-glass-border-strong aspect-video flex items-center justify-center shadow-sm transition-all duration-200"
                >
                  {isImage ? (
                    <img
                      src={media.url}
                      alt={media.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : isVideo ? (
                    <div className="flex flex-col items-center justify-center gap-1 text-text-subtle">
                      <Film className="w-7 h-7 text-brand" strokeWidth={1.8} />
                      <span className="text-caption text-text-muted font-medium">Vídeo</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-text-subtle">
                      <FileText className="w-7 h-7" strokeWidth={1.8} />
                      <span className="text-caption text-text-muted font-medium">Arquivo</span>
                    </div>
                  )}

                  {/* Badges de categoria discretos no topo */}
                  {media.category === 'problem' && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-surface-raised/90 backdrop-blur-md border border-glass-border text-caption font-medium text-brand pointer-events-none z-10">
                      Entrada
                    </span>
                  )}

                  {/* Overlay de Ações (Hover / Focus) */}
                  <div className="absolute inset-0 bg-surface/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                    <button
                      type="button"
                      onClick={() => setPreviewItem(media)}
                      aria-label={`Visualizar ${media.name}`}
                      title="Visualizar anexo"
                      className="rounded-full p-2 bg-surface-raised border border-glass-border text-text-muted hover:text-text hover:border-brand hover:scale-105 active:scale-95 transition-all shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      <Eye className="w-4 h-4" strokeWidth={1.8} />
                    </button>

                    {!readOnly && onRemoveFile && (
                      <button
                        type="button"
                        onClick={() => onRemoveFile(idx)}
                        aria-label={`Remover ${media.name}`}
                        title="Remover anexo"
                        className="rounded-full p-2 bg-surface-raised border border-glass-border text-text-muted hover:text-danger hover:border-danger hover:scale-105 active:scale-95 transition-all shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                      </button>
                    )}
                  </div>

                  {/* Nome do arquivo na base */}
                  <p className="absolute bottom-0 inset-x-0 px-2 py-1 bg-surface/90 backdrop-blur-xs text-caption text-text-muted truncate pointer-events-none border-t border-glass-divider font-mono">
                    {media.name}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Modal de Pré-visualização do Anexo */}
      <Modal
        open={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        title={previewItem?.name || 'Anexo'}
        description={previewItem?.type || 'Mídia em anexo'}
        size="xl"
      >
        {previewItem && (
          <div className="flex items-center justify-center p-2">
            {previewItem.type?.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(previewItem.name) ? (
              <video
                src={previewItem.url}
                controls
                autoPlay
                className="max-w-full max-h-[70vh] rounded-xl mx-auto shadow-2xl bg-black"
              >
                Seu navegador não suporta a reprodução deste vídeo.
              </video>
            ) : previewItem.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(previewItem.name) ? (
              <img
                src={previewItem.url}
                alt={previewItem.name}
                className="max-w-full max-h-[70vh] rounded-xl mx-auto object-contain shadow-2xl"
              />
            ) : (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-text-muted">
                <FileText className="w-16 h-16 text-text-subtle" strokeWidth={1.5} />
                <p className="text-body font-medium">{previewItem.name}</p>
                <a
                  href={previewItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-full bg-brand text-brand-contrast text-small font-semibold hover:bg-brand-hover transition-colors"
                >
                  Abrir arquivo externamente
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
