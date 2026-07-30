'use client';
import { Paperclip, Upload, Film, FileText, Eye, Trash2 } from 'lucide-react';
import React from 'react';

import { LoadingSpinner, Modal } from '@/components/ui';

interface AttachmentsSectionProps {
  mediaFiles: any[];
  uploading: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveFile: (index: number) => void;
  previewImage: string | null;
  setPreviewImage: (v: string | null) => void;
}

/** Botão de ação sobre a miniatura. Aparece no hover e no foco por teclado. */
const OVERLAY_ACTION =
  'p-1.5 bg-surface-raised border border-border text-text-muted hover:text-text transition-colors cursor-pointer ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

export function AttachmentsSection({
  mediaFiles, uploading, handleFileUpload, handleRemoveFile, previewImage, setPreviewImage
}: AttachmentsSectionProps) {
  return (
    <>
      <div className="space-y-3 pt-4 border-t border-border">
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-text-subtle" aria-hidden /> Mídias e Anexos do Serviço
          </p>
          <span className="text-caption uppercase tracking-wider text-text-subtle">Apenas Técnicos</span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-surface-sunken border border-border hover:border-border-strong text-small font-semibold text-text cursor-pointer transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand">
            {uploading ? (
              <LoadingSpinner className="w-4 h-4 text-brand" />
            ) : (
              <Upload className="w-4 h-4 text-text-subtle" aria-hidden />
            )}
            <span>{uploading ? 'Carregando...' : 'Anexar mídia'}</span>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              disabled={uploading}
              onChange={handleFileUpload}
              className="sr-only"
            />
          </label>
          <p className="text-caption text-text-subtle">JPG, PNG, MP4.</p>
        </div>

        {mediaFiles.length > 0 && (
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            {mediaFiles.map((media, idx) => {
              const isImage = media.type?.startsWith('image/');
              const isVideo = media.type?.startsWith('video/');

              return (
                <li
                  key={idx}
                  className="group relative bg-surface-sunken overflow-hidden border border-border aspect-video"
                >
                  {isImage ? (
                    <img
                      src={media.url}
                      alt={media.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-text-subtle">
                      {isVideo ? <Film className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-surface/80 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-3 z-10">
                    {isImage && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(media.url)}
                        aria-label={`Ver ${media.name}`}
                        className={OVERLAY_ACTION}
                      >
                        <Eye className="w-4 h-4" aria-hidden />
                      </button>
                    )}
                    {isVideo && (
                      <a
                        href={media.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Abrir ${media.name}`}
                        className={OVERLAY_ACTION}
                      >
                        <Eye className="w-4 h-4" aria-hidden />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      aria-label={`Remover ${media.name}`}
                      className={`${OVERLAY_ACTION} hover:text-danger`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                  <p className="absolute bottom-0 inset-x-0 p-2 bg-surface/90 text-caption text-text-muted truncate pointer-events-none">
                    {media.name}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title="Anexo"
        size="xl"
      >
        {previewImage && (
          <img
            src={previewImage}
            alt="Preview do anexo"
            className="max-w-full max-h-[70vh] mx-auto object-contain"
          />
        )}
      </Modal>
    </>
  );
}
