
import { X, Chrome, AlertCircle } from 'lucide-react';

interface BrowserSupportAlertProps {
  onClose: () => void;
}

export function BrowserSupportAlert({ onClose }: BrowserSupportAlertProps) {
  // 检测是否支持 showDirectoryPicker API
  const supportsDirectoryPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // 如果支持或者不是 Safari，不显示提示
  if (supportsDirectoryPicker || !isSafari) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md">
      <div className="bg-bg border border-border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-semibold text-text">浏览器兼容性提示</h3>
            </div>
            <p className="text-xs text-text-secondary mb-3">
              Safari 浏览器暂不支持文件夹选择功能。为获得最佳体验，建议使用以下浏览器：
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Chrome className="w-4 h-4 text-green-600" />
                <span>Google Chrome 86+（推荐）</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <div className="w-4 h-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded flex items-center justify-center text-white text-[8px] font-bold">
                  E
                </div>
                <span>Microsoft Edge 86+</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center text-white text-[8px] font-bold">
                  FF
                </div>
                <span>Mozilla Firefox 108+</span>
              </div>
            </div>
            <p className="text-[10px] text-text-tertiary mt-3">
              <strong>说明:</strong> 本应用使用 File System Access API 实现文件夹选择，这是现代 Web
              标准。Safari 正在实现此功能，请关注后续版本更新。
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
