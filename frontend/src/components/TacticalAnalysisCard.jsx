/**
 * TacticalAnalysisCard Component
 * Renders Bedrock substitution analysis with synergy gauge
 * 
 * Props:
 * - analysis: {
 *     synergy_score: number (-10 to +10),
 *     verdict: string,
 *     risk: string,
 *     manager_rating: string,
 *     real_time_note: string,
 *   }
 * - starter: { name, playing_position }
 * - bench: { name, playing_position }
 * - onTryAnother: () => void (callback to reset and try another match)
 */
export default function TacticalAnalysisCard({ analysis, starter, bench, onTryAnother }) {
  if (!analysis || !starter || !bench) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <p className="text-gray-600">No analysis data available</p>
      </div>
    );
  }

  const synergy = analysis.synergy_score;

  /**
   * Determine gauge color based on synergy score
   * Green if > 0, Red if < 0, Gray if = 0
   */
  const getGaugeColor = () => {
    if (synergy > 0) {
      return {
        bgClass: 'bg-green-100',
        fillClass: 'bg-green-500',
        textClass: 'text-green-700',
        borderClass: 'border-green-300',
        labelClass: 'text-green-600',
      };
    } else if (synergy < 0) {
      return {
        bgClass: 'bg-red-100',
        fillClass: 'bg-red-500',
        textClass: 'text-red-700',
        borderClass: 'border-red-300',
        labelClass: 'text-red-600',
      };
    } else {
      return {
        bgClass: 'bg-gray-100',
        fillClass: 'bg-gray-500',
        textClass: 'text-gray-700',
        borderClass: 'border-gray-300',
        labelClass: 'text-gray-600',
      };
    }
  };

  const gaugeColor = getGaugeColor();

  /**
   * Calculate gauge fill percentage (0-100)
   * synergy_score ranges from -10 to +10
   * We map this to 0-100 where:
   * -10 = 0%, 0 = 50%, +10 = 100%
   */
  const calculateFillPercentage = () => {
    return ((synergy + 10) / 20) * 100;
  };

  const fillPercentage = calculateFillPercentage();

  /**
   * Get synergy interpretation label
   */
  const getSynergyLabel = () => {
    if (synergy >= 8) return 'Excellent Fit';
    if (synergy >= 5) return 'Strong Synergy';
    if (synergy >= 2) return 'Good Match';
    if (synergy > 0) return 'Positive Impact';
    if (synergy === 0) return 'Neutral';
    if (synergy > -2) return 'Minor Risk';
    if (synergy > -5) return 'Moderate Risk';
    if (synergy > -8) return 'High Risk';
    return 'Poor Fit';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* Header with player swap info */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 border-b-2 border-blue-200">
        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Tactical Analysis
        </h3>

        {/* Player Swap Display */}
        <div className="flex items-center justify-between gap-4 bg-white rounded-lg p-4 border border-blue-200">
          {/* Starter (Out) */}
          <div className="flex-1 text-center">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">
              Out
            </p>
            <p className="text-lg font-bold text-gray-900">{starter.name}</p>
            <p className="text-sm text-gray-600">{starter.playing_position}</p>
          </div>

          {/* Arrow */}
          <div className="text-2xl text-blue-600 font-bold">⇄</div>

          {/* Bench (In) */}
          <div className="flex-1 text-center">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">
              In
            </p>
            <p className="text-lg font-bold text-gray-900">{bench.name}</p>
            <p className="text-sm text-gray-600">{bench.playing_position}</p>
          </div>
        </div>
      </div>

      {/* Synergy Score Gauge */}
      <div className="p-6 border-b border-gray-200">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Synergy Score
            </h4>
            <span className={`text-2xl font-bold ${gaugeColor.textClass}`}>
              {synergy > 0 ? '+' : ''}{synergy.toFixed(1)}
            </span>
          </div>

          {/* Gauge Bar */}
          <div className={`w-full h-8 rounded-full ${gaugeColor.bgClass} border-2 ${gaugeColor.borderClass} overflow-hidden relative`}>
            {/* Fill */}
            <div
              className={`h-full ${gaugeColor.fillClass} transition-all duration-500 ease-out flex items-center justify-center`}
              style={{ width: `${fillPercentage}%` }}
            >
              {fillPercentage > 20 && (
                <span className="text-xs font-bold text-white">
                  {fillPercentage.toFixed(0)}%
                </span>
              )}
            </div>

            {/* Scale markers */}
            <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
              <span className="text-xs font-semibold text-gray-600">-10</span>
              <span className="text-xs font-semibold text-gray-600">0</span>
              <span className="text-xs font-semibold text-gray-600">+10</span>
            </div>
          </div>

          {/* Synergy Label */}
          <div className="mt-3 text-center">
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold border-2 ${gaugeColor.bgClass} ${gaugeColor.borderClass} ${gaugeColor.labelClass}`}>
              {getSynergyLabel()}
            </span>
          </div>
        </div>
      </div>

      {/* Analysis Fields */}
      <div className="p-6 space-y-6">
        {/* Verdict */}
        <div>
          <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
            Verdict
          </h5>
          <p className="text-gray-700 leading-relaxed text-sm md:text-base">
            {analysis.verdict}
          </p>
        </div>

        {/* Risk */}
        <div>
          <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
            Tactical Risk
          </h5>
          <p className="text-gray-700 leading-relaxed text-sm md:text-base">
            {analysis.risk}
          </p>
        </div>

        {/* Manager Rating */}
        <div>
          <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
            Manager Rating
          </h5>
          <p className="text-gray-700 leading-relaxed text-sm md:text-base">
            {analysis.manager_rating}
          </p>
        </div>

        {/* Real-Time Note */}
        <div>
          <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
            Real-Time Note
          </h5>
          <p className="text-gray-700 leading-relaxed text-sm md:text-base">
            {analysis.real_time_note}
          </p>
        </div>
      </div>

      {/* Footer with action button */}
      <div className="bg-gray-50 p-6 border-t border-gray-200 flex justify-center">
        <button
          onClick={onTryAnother}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
          aria-label="Try Another Match - Reset substitution simulator"
        >
          Try Another Match →
        </button>
      </div>
    </div>
  );
}
