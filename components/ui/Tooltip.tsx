'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<any>;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  
  // We use any to allow refs on the cloned element
  const childRef = useRef<any>(null);

  const updatePosition = () => {
    if (childRef.current) {
      const rect = childRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    }
  };

  const handleMouseEnter = (e: any) => {
    updatePosition();
    setIsVisible(true);
    if (children.props.onMouseEnter) {
      children.props.onMouseEnter(e);
    }
  };

  const handleMouseLeave = (e: any) => {
    setIsVisible(false);
    if (children.props.onMouseLeave) {
      children.props.onMouseLeave(e);
    }
  };

  return (
    <>
      {React.cloneElement(children, {
        ref: childRef,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      })}
      {isVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed px-3 py-1.5 bg-surface-raised border border-border text-text text-sm font-medium rounded-xl shadow-md whitespace-nowrap z-[9999] pointer-events-none transition-all duration-200"
            style={{
              top: coords.top,
              left: coords.left,
              transform: 'translateY(-50%)',
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
