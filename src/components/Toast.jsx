import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function Toast({ toast }) {
  if (!toast) return null;

  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4 safe-top">
      <div
        className={`pointer-events-auto flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium shadow-card backdrop-blur-md transition-all ${
          isError
            ? 'border-[#C85A32]/30 bg-white/95 text-[#AE4A26]'
            : isInfo
              ? 'border-[#EAE5DD] bg-white/95 text-[#26211D]'
              : 'border-[#4A7C59]/30 bg-white/95 text-[#4A7C59]'
        }`}
        role="status"
      >
        {isError ? (
          <AlertCircle className="h-4 w-4 shrink-0 text-[#C85A32]" />
        ) : isInfo ? (
          <Info className="h-4 w-4 shrink-0 text-[#C85A32]" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4A7C59]" />
        )}
        <span className="text-[#26211D]">{toast.message}</span>
      </div>
    </div>
  );
}
