import { Download, X } from 'lucide-react';

interface UpdateBannerProps {
  onDismiss: () => void;
}

export function UpdateBanner({ onDismiss }: UpdateBannerProps) {
  const handleInstall = () => {
    const api = (window as any).electronAPI;
    api.downloadAndInstallUpdate?.();
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/8 px-4 py-2.5 shadow-lg backdrop-blur-sm">
      <Download className="h-4 w-4 text-primary shrink-0" />
      <span className="text-xs font-medium text-text">A new version is available</span>
      <button
        onClick={handleInstall}
        className="rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-white hover:bg-primary/90 transition-colors cursor-pointer"
      >
        Restart & Update
      </button>
      <button
        onClick={onDismiss}
        className="ml-1 rounded-md p-0.5 text-text-tertiary hover:text-text hover:bg-bg-warm transition-colors cursor-pointer"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
