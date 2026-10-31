import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FileDropzone } from './FileDropzone';

describe('FileDropzone Component', () => {
  it('renderiza o título, subtítulo e área de upload corretamente', () => {
    const onFilesSelected = vi.fn();
    render(
      <FileDropzone
        files={[]}
        onFilesSelected={onFilesSelected}
        title="Arraste fotos ou vídeos aqui"
        subtitle="JPG, PNG, WebP ou MP4 até 15MB"
      />
    );

    expect(screen.getByText('Arraste fotos ou vídeos aqui')).toBeDefined();
    expect(screen.getByText('JPG, PNG, WebP ou MP4 até 15MB')).toBeDefined();
  });

  it('permite selecionar arquivos através do input tradicional de arquivo', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(
      <FileDropzone
        files={[]}
        onFilesSelected={onFilesSelected}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDefined();

    const file = new File(['dummy content'], 'foto1.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it('suporta evento de soltura (drop) de arquivos', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(
      <FileDropzone
        files={[]}
        onFilesSelected={onFilesSelected}
      />
    );

    const dropArea = container.querySelector('div[role="button"]');
    const file = new File(['dummy video'], 'video.mp4', { type: 'video/mp4' });

    fireEvent.dragEnter(dropArea!, {
      dataTransfer: { items: [{ kind: 'file', type: 'video/mp4' }] },
    });

    fireEvent.drop(dropArea!, {
      dataTransfer: {
        files: [file],
        clearData: vi.fn(),
      },
    });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it('exibe miniaturas e permite remover arquivos via onRemoveFile', () => {
    const onRemoveFile = vi.fn();
    const files = [
      { name: 'teste.png', url: 'https://placehold.co/100x100.png', type: 'image/png' },
      { name: 'video.mp4', url: 'https://placehold.co/video.mp4', type: 'video/mp4' },
    ];

    render(
      <FileDropzone
        files={files}
        onFilesSelected={vi.fn()}
        onRemoveFile={onRemoveFile}
      />
    );

    expect(screen.getByText('teste.png')).toBeDefined();
    expect(screen.getByText('video.mp4')).toBeDefined();

    const removeButtons = screen.getAllByRole('button', { name: /Remover/i });
    expect(removeButtons.length).toBe(2);

    fireEvent.click(removeButtons[0]);
    expect(onRemoveFile).toHaveBeenCalledWith(0);
  });

  it('respeita a propriedade disabled ignorando drops', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(
      <FileDropzone
        files={[]}
        disabled
        onFilesSelected={onFilesSelected}
      />
    );

    const dropArea = container.querySelector('div[role="button"]');
    const file = new File(['content'], 'test.png', { type: 'image/png' });

    fireEvent.drop(dropArea!, {
      dataTransfer: {
        files: [file],
        clearData: vi.fn(),
      },
    });

    expect(onFilesSelected).not.toHaveBeenCalled();
  });
});
