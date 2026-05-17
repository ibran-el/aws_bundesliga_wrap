/**
 * MVPCard Component
 * Renders a single player card with Impact Score, stats grid, and scout report
 * 
 * Props:
 * - rank: 1 | 2 | 3 (player's rank position)
 * - player: {
 *     name: string,
 *     impact_score: number (0-100),
 *     goal_participations: number,
 *     xg: number,
 *     xg_efficiency: number,
 *     distance_per90_km: number,
 *     max_speed_kmh: number,
 *   }
 * - scoutReport: {
 *     headline: string,
 *     scout_report: string (3 sentences),
 *     season_label: string,
 *     shareable_line?: string (optional)
 *   }
 */
export default function MVPCard({ rank, player, scoutReport }) {
  if (!player || !scoutReport) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <p className="text-gray-600">No player data available</p>
      </div>
    );
  }

  /**
   * Get rank badge styling and text
   */
  const getRankBadge = () => {
    const rankTexts = {
      1: '🥇 1st',
      2: '🥈 2nd',
      3: '🥉 3rd',
    };

    const rankColors = {
      1: 'bg-yellow-100 text-yellow-900 border-yellow-300',
      2: 'bg-gray-100 text-gray-900 border-gray-300',
      3: 'bg-orange-100 text-orange-900 border-orange-300',
    };

    return {
      text: rankTexts[rank] || `#${rank}`,
      colorClass: rankColors[rank] || 'bg-blue-100 text-blue-900 border-blue-300',
    };
  };

  const rankBadge = getRankBadge();

  /**
   * Format stat values for display
   */
  const formatStat = (value, decimals = 1) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      return value.toFixed(decimals);
    }
    return value;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* Header with rank badge and player name */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 border-b-2 border-blue-200">
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Rank Badge */}
          <div
            className={`px-4 py-2 rounded-full font-bold text-sm border-2 whitespace-nowrap ${rankBadge.colorClass}`}
          >
            {rankBadge.text}
          </div>

          {/* Impact Score */}
          <div className="text-right">
            <p className="text-4xl font-bold text-blue-600">
              {formatStat(player.impact_score, 1)}
            </p>
            <p className="text-xs text-gray-600 font-semibold">Impact Score</p>
          </div>
        </div>

        {/* Player Name */}
        <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
          {player.name}
        </h3>
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
          Season Statistics
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Goal Participations */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
              Goal Participations
            </p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {formatStat(player.goal_participations, 0)}
            </p>
          </div>

          {/* xG (Expected Goals) */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
              xG
            </p>
            <p className="text-2xl font-bold text-purple-700 mt-1">
              {formatStat(player.xg, 2)}
            </p>
          </div>

          {/* xG Efficiency */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
              xG Efficiency
            </p>
            <p className="text-2xl font-bold text-orange-700 mt-1">
              {formatStat(player.xg_efficiency, 2)}
            </p>
          </div>

          {/* Distance per 90 km */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
              Distance/90 (km)
            </p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {formatStat(player.distance_per90_km, 1)}
            </p>
          </div>

          {/* Max Speed km/h */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
              Max Speed (km/h)
            </p>
            <p className="text-2xl font-bold text-red-700 mt-1">
              {formatStat(player.max_speed_kmh, 1)}
            </p>
          </div>
        </div>
      </div>

      {/* Scout Report Section */}
      <div className="bg-gray-50 p-6 border-t border-gray-200">
        {/* Headline */}
        <h4 className="text-lg font-bold text-gray-900 mb-3">
          {scoutReport.headline}
        </h4>

        {/* Scout Report Text (3 sentences) */}
        <p className="text-gray-700 leading-relaxed mb-4 text-sm md:text-base">
          {scoutReport.scout_report}
        </p>

        {/* Season Label Badge */}
        {scoutReport.season_label && (
          <div className="inline-block bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-xs font-semibold border border-blue-300">
            {scoutReport.season_label}
          </div>
        )}
      </div>
    </div>
  );
}
