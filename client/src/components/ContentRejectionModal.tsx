import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ContentRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContentRejectionModal: React.FC<ContentRejectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-500/20 rounded-full">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-center text-xl font-semibold text-white mb-2">
          Content Not Accepted
        </h2>

        {/* Message */}
        <p className="text-center text-gray-300 text-sm mb-6">
          SYNAPSE is designed for educational use and cannot process this
          content. If you believe this is an error, please review our content
          guidelines.
        </p>

        {/* Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          OK, understood
        </button>
      </div>
    </div>
  );
};

export default ContentRejectionModal;
