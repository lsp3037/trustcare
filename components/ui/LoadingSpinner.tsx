import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps extends Omit<React.ComponentProps<typeof Loader2>, 'size'> {
  className?: string;
  size?: number | string;
}

export function LoadingSpinner({ className = "text-blue-500", size, ...props }: LoadingSpinnerProps) {
  return (
    <Loader2 
      size={size}
      className={`animate-spin ${className}`} 
      {...props}
    />
  );
}
