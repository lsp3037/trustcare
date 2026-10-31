'use client';

import React from 'react';
import { Paperclip } from 'lucide-react';
import { FileDropzone } from '@/components/ui';

interface AttachmentsSectionProps {
  mediaFiles: any[];
  uploading: boolean;
  handleFileUpload: (filesOrEvent: React.ChangeEvent<HTMLInputElement> | File[]) => void;
  handleRemoveFile: (index: number) => void;
  previewImage?: string | null;
  setPreviewImage?: (v: string | null) => void;
  readOnly?: boolean;
}

export function AttachmentsSection({
  mediaFiles,
  uploading,
  handleFileUpload,
  handleRemoveFile,
  readOnly = false,
}: AttachmentsSectionProps) {
  const handleFilesSelected = (files: File[]) => {
    handleFileUpload(files);
  };

  return (
    <div className="space-y-3 pt-4 border-t border-glass-divider">
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption uppercase tracking-wider text-text-muted flex items-center gap-1.5 font-semibold">
          <Paperclip className="w-3.5 h-3.5 text-text-subtle" strokeWidth={1.8} aria-hidden /> Mídias e Anexos do Serviço
        </p>
        <span className="text-caption uppercase tracking-wider text-text-subtle font-semibold">Apenas Técnicos</span>
      </div>

      <FileDropzone
        files={mediaFiles}
        loading={uploading}
        onFilesSelected={handleFilesSelected}
        onRemoveFile={handleRemoveFile}
        title="Arraste fotos ou vídeos aqui, ou clique para anexar"
        subtitle="JPG, PNG, WebP ou MP4 até 15MB"
        readOnly={readOnly}
      />
    </div>
  );
}
