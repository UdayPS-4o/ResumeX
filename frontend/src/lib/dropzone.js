import { useCallback, useRef, useState } from 'react';

// Local replacement for the (now-removed-from-npm) `clipboard-drop` package:
// a minimal drag/drop + paste helper for attaching files/images to the chat
// and for the template-import dropzone.

function matchesAccept(file, accept) {
  if (!accept || accept.length === 0) return true;
  const name = file.name || '';
  const type = file.type || '';
  return accept.some((pattern) => {
    if (pattern.startsWith('.')) return name.toLowerCase().endsWith(pattern.toLowerCase());
    if (pattern.endsWith('/*')) return type.startsWith(pattern.slice(0, -1));
    return type === pattern;
  });
}

export function useDropzone({ accept, multiple = false, onDrop } = {}) {
  const [isDragging, setIsDragging] = useState(false);
  const nodeRef = useRef(null);
  const dragDepth = useRef(0);

  const filterFiles = useCallback((fileList) => {
    const files = Array.from(fileList || []).filter((f) => matchesAccept(f, accept));
    return multiple ? files : files.slice(0, 1);
  }, [accept, multiple]);

  const handleDragEnter = useCallback((e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const files = filterFiles(e.dataTransfer?.files);
    if (files.length) onDrop?.(files);
  }, [filterFiles, onDrop]);

  const attachRef = useCallback((node) => {
    if (nodeRef.current) {
      nodeRef.current.removeEventListener('dragenter', handleDragEnter);
      nodeRef.current.removeEventListener('dragover', handleDragOver);
      nodeRef.current.removeEventListener('dragleave', handleDragLeave);
      nodeRef.current.removeEventListener('drop', handleDrop);
    }
    nodeRef.current = node || null;
    if (node) {
      node.addEventListener('dragenter', handleDragEnter);
      node.addEventListener('dragover', handleDragOver);
      node.addEventListener('dragleave', handleDragLeave);
      node.addEventListener('drop', handleDrop);
    }
  }, [handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

  const openFileDialog = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = !!multiple;
    if (accept?.length) input.accept = accept.join(',');
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const files = filterFiles(input.files);
      if (files.length) onDrop?.(files);
      input.remove();
    }, { once: true });
    document.body.appendChild(input);
    input.click();
  }, [accept, multiple, filterFiles, onDrop]);

  const getRootProps = useCallback(() => ({
    ref: attachRef,
    onClick: openFileDialog,
  }), [attachRef, openFileDialog]);

  return { getRootProps, isDragging };
}

export function usePaste(onPaste) {
  const nodeRef = useRef(null);

  const handlePaste = useCallback((e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = items
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter(Boolean);
    const images = files.filter((f) => f.type.startsWith('image/'));
    onPaste?.({ images, files, preventDefault: () => e.preventDefault() });
  }, [onPaste]);

  return useCallback((node) => {
    if (nodeRef.current) nodeRef.current.removeEventListener('paste', handlePaste);
    nodeRef.current = node || null;
    if (node) node.addEventListener('paste', handlePaste);
  }, [handlePaste]);
}
