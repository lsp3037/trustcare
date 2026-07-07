'use client';
import { Paperclip, Upload, Film, FileText, Eye, Trash2, X } from 'lucide-react';
import React from 'react';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface AttachmentsSectionProps {
  mediaFiles: any[];
  uploading: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveFile: (index: number) => void;
  previewImage: string | null;
  setPreviewImage: (v: string | null) => void;
}

export function AttachmentsSection({
  mediaFiles, uploading, handleFileUpload, handleRemoveFile, previewImage, setPreviewImage
}: AttachmentsSectionProps) {
  return (
    <>
      <div className="space-y-3 pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-blue-500" /> Mídias e Anexos do Serviço
          </label>
          <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Apenas Técnicos</span>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-4 py-2.5 rounded-none cursor-pointer text-[10px] font-mono tracking-wider text-zinc-200 transition-all active:scale-95 group">
            {uploading ? (
              <LoadingSpinner className="w-4 h-4 text-blue-500 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
            )}
            <span>{uploading ? 'CARREGANDO...' : 'ANEXAR MÍDIA'}</span>
            <input type="file" multiple accept="image/*,video/*" disabled={uploading} onChange={handleFileUpload} className="hidden" />
          </label>
          <p className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">JPG, PNG, MP4.</p>
        </div>

        {mediaFiles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            {mediaFiles.map((media, idx) => {
              const isImage = media.type?.startsWith('image/');
              const isVideo = media.type?.startsWith('video/');

              return (
                <div key={idx} className="group relative bg-zinc-950 rounded-none overflow-hidden border border-zinc-800 aspect-video flex flex-col justify-between transition-all hover:border-zinc-600">
                  {isImage ? (
                    <img src={media.url} alt={media.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : isVideo ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
                      <Film className="w-8 h-8 text-zinc-600 group-hover:text-blue-500 transition-colors" />
                      <span className="absolute bottom-2 left-2 text-[8px] bg-zinc-900/80 px-1.5 py-0.5 rounded-none text-zinc-400 font-bold uppercase tracking-wider">Vídeo</span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
                      <FileText className="w-8 h-8 text-zinc-600" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-zinc-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-10">
                    {isImage && (
                      <button type="button" onClick={() => setPreviewImage(media.url)} className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-none text-zinc-200 hover:text-white transition-all cursor-pointer">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {isVideo && (
                      <a href={media.url} target="_blank" rel="noreferrer" className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-none text-zinc-200 hover:text-white transition-all cursor-pointer flex items-center justify-center">
                        <Eye className="w-4 h-4" />
                      </a>
                    )}
                    <button type="button" onClick={() => handleRemoveFile(idx)} className="p-1.5 bg-zinc-900 hover:bg-rose-950/50 border border-zinc-800 hover:border-rose-900/50 rounded-none text-zinc-400 hover:text-rose-400 transition-all cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none">
                    <p className="text-[9px] text-zinc-300 truncate font-mono">{media.name}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {previewImage && (
        <div className="fixed inset-0 bg-zinc-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-none text-zinc-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-none border border-zinc-800 shadow-2xl relative bg-zinc-900">
            <img src={previewImage} alt="Preview do anexo" className="max-w-full max-h-[85vh] object-contain" />
          </div>
        </div>
      )}
    </>
  );
}
