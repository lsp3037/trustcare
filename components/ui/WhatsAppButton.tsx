import React from 'react';

export const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.128.552 4.195 1.6 6.012L.41 23.59a.75.75 0 00.916.916l5.545-1.19c1.78.966 3.766 1.472 5.8 1.472 6.645 0 12.03-5.385 12.03-12.03S18.676 0 12.03 0h.001zm0 22.188c-1.848 0-3.666-.484-5.263-1.404a.75.75 0 00-.518-.086l-3.864.83.83-3.865a.75.75 0 00-.085-.518 10.5 10.5 0 01-1.405-5.262c0-5.807 4.726-10.533 10.533-10.533 5.806 0 10.533 4.726 10.533 10.533 0 5.807-4.727 10.533-10.533 10.533zm5.727-8.136c-.314-.157-1.859-.918-2.146-1.023-.287-.105-.497-.157-.706.157-.21.314-.81 1.023-.993 1.233-.183.21-.366.236-.68.079-1.393-.695-2.589-1.636-3.486-2.753-.223-.284-.047-.43.111-.586.14-.138.314-.366.471-.55.157-.183.21-.314.314-.523.105-.21.053-.393-.026-.55-.079-.157-.707-1.702-.969-2.33-.255-.612-.514-.529-.706-.539-.183-.01-.393-.01-.602-.01-.21 0-.55.079-.838.393-.288.314-1.1 1.074-1.1 2.619 0 1.545 1.126 3.037 1.283 3.247.157.21 2.215 3.383 5.367 4.743.751.325 1.337.52 1.794.665.754.24 1.442.206 1.984.125.607-.091 1.86-.76 2.122-1.493.262-.733.262-1.362.184-1.493-.079-.131-.288-.21-.602-.367z" />
  </svg>
);

export const getWhatsAppLink = (phone: string) => {
  if (!phone) return '#';
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/55${cleanPhone}`;
};

interface WhatsAppButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  phone: string;
  showText?: boolean;
}

export function WhatsAppButton({ phone, className, showText = false, ...props }: WhatsAppButtonProps) {
  if (!phone) return null;

  return (
    <a
      href={getWhatsAppLink(phone)}
      target="_blank"
      rel="noopener noreferrer"
      title="Enviar mensagem no WhatsApp"
      className={className || "p-1.5 rounded-none shrink-0 bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors flex items-center justify-center"}
      {...props}
    >
      <WhatsAppIcon className={showText ? "w-3.5 h-3.5 mr-1.5" : "w-3.5 h-3.5"} />
      {showText && <span>WhatsApp</span>}
    </a>
  );
}
