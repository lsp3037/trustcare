'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-32 w-full animate-pulse bg-zinc-950 border border-zinc-800 rounded-none" />
});

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['clean']
  ]
};

const formats = ['bold', 'italic', 'underline', 'list', 'bullet', 'align'];

interface TechnicalReportSectionProps {
  reportedProblem: string;
  setReportedProblem: (v: string) => void;
  technicalReport: string;
  setTechnicalReport: (v: string) => void;
}

export function TechnicalReportSection({
  reportedProblem, setReportedProblem,
  technicalReport, setTechnicalReport
}: TechnicalReportSectionProps) {
  return (
    <>
      <div className="bg-zinc-950/50 p-4 rounded-none border border-zinc-900 w-full max-w-full overflow-hidden break-words mb-8">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Problema Relatado / Defeito</p>
        <ReactQuill
          theme="snow"
          value={reportedProblem}
          onChange={setReportedProblem}
          modules={modules}
          formats={formats}
          className="bg-zinc-950 rounded-none border border-zinc-800 prose prose-invert text-zinc-300 max-w-none text-sm"
        />
      </div>

      <div className="space-y-1.5 mt-6">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Laudo Técnico / Serviço Realizado</label>
        <div className="bg-zinc-950 rounded-none border border-zinc-800 overflow-hidden">
          <ReactQuill
            theme="snow"
            modules={modules}
            formats={formats}
            value={technicalReport}
            onChange={setTechnicalReport}
            placeholder="Insira as observações técnicas detalhadas, testes executados e solução encontrada..."
            className="prose prose-invert max-w-none text-sm"
          />
        </div>
      </div>
    </>
  );
}
