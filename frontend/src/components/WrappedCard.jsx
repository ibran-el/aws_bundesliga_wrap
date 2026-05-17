import { useState } from 'react';
import Toast from './Toast';

/**
 * WrappedCard Component
 * Renders a personalized Wrapped card with all narrative fields from Bedrock Stage 3
 * 
 * Props:
 * - wrappedData: { user_name, favorite_club, wrapped_card: { greeting, season_story, fan_stat, tactical_identity, season_verdict, share_text } }
 * - clubColor: hex color string for the card background (primary_color from club)
 * - onNext: callback function when Next button is clicked
 */
export default function WrappedCard({ wrappedData, clubColor, onNext }) {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  if (!wrappedData || !wrappedData.wrapped_card) {
    return (
      <div className="p-8">
        <p className="text-gray-600">No wrapped data available</p>
      </div>
    );
  }

  const { wrapped_card, user_name, favorite_club } = wrappedData;
  const {
    greeting,
    season_story,
    fan_stat,
    tactical_identity,
    season_verdict,
    share_text,
  } = wrapped_card;

  /**
   * Handle share button click: copy share_text to clipboard
   */
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(share_text);
      setToastMessage('Copied to clipboard!');
      setShowToast(true);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setToastMessage('Failed to copy. Please try again.');
      setShowToast(true);
    }
  };

  /**
   * Determine text color based on background brightness
   * Light backgrounds get dark text, dark backgrounds get light text
   */
  const getTextColor = (hexColor) => {
    if (!hexColor) return 'text-gray-900';
    
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return dark text for light backgrounds, light text for dark backgrounds
    return luminance > 0.5 ? 'text-gray-900' : 'text-white';
  };

  const textColorClass = getTextColor(clubColor);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      {/* Full-screen card with club color background */}
      <div
        className={`w-full max-w-2xl rounded-lg shadow-2xl p-8 md:p-12 ${textColorClass}`}
        style={{ backgroundColor: clubColor || '#3B82F6' }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Your Bundesliga Wrapped 2024–25
          </h1>
          <p className="text-lg opacity-90">
            {user_name} • {favorite_club}
          </p>
        </div>

        {/* Greeting */}
        <section className="mb-8">
          <p className="text-xl md:text-2xl font-semibold leading-relaxed">
            {greeting}
          </p>
        </section>

        {/* Season Story */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3 opacity-90">Your Season Story</h2>
          <p className="text-base md:text-lg leading-relaxed opacity-95">
            {season_story}
          </p>
        </section>

        {/* Fan Stat */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3 opacity-90">Your Fan Stat</h2>
          <p className="text-base md:text-lg leading-relaxed opacity-95">
            {fan_stat}
          </p>
        </section>

        {/* Tactical Identity */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3 opacity-90">Your Tactical Identity</h2>
          <p className="text-base md:text-lg leading-relaxed opacity-95">
            {tactical_identity}
          </p>
        </section>

        {/* Season Verdict */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3 opacity-90">Season Verdict</h2>
          <p className="text-base md:text-lg leading-relaxed opacity-95">
            {season_verdict}
          </p>
        </section>

        {/* Share Text (hidden but available for sharing) */}
        <section className="mb-8 p-4 rounded opacity-75 bg-black bg-opacity-10">
          <p className="text-sm italic">
            "{share_text}"
          </p>
        </section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-12">
          <button
            onClick={handleShare}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              textColorClass === 'text-white'
                ? 'bg-white text-gray-900 hover:bg-gray-100'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
            aria-label="Share wrapped card text to clipboard"
          >
            📋 Share
          </button>
          <button
            onClick={onNext}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              textColorClass === 'text-white'
                ? 'bg-white text-gray-900 hover:bg-gray-100'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
            aria-label="Continue to MVP Leaderboard"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Toast notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          onDismiss={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
