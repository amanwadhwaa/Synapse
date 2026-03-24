import React, { useState } from "react";
import { Shield } from "lucide-react";

const ResponsibleAIBadge: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
        title="Information about responsible AI"
      >
        <Shield className="h-4 w-4 text-green-400" />
        <span className="text-xs font-medium text-gray-300">Responsible AI</span>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-800 border border-white/20 rounded-lg p-3 shadow-lg text-xs text-gray-300 z-50">
          <p className="mb-2">
            SYNAPSE uses AI responsibly. All content is moderated to ensure a
            safe learning environment.
          </p>
          <p className="text-gray-400">
            AI responses may not always be accurate — always verify important
            information.
          </p>
        </div>
      )}
    </div>
  );
};

export default ResponsibleAIBadge;
