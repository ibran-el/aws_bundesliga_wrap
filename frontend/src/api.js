/**
 * API Module for Bundesliga Wrapped Frontend
 * 
 * Provides wrapper functions for all 5 API Gateway endpoints with:
 * - 10-second timeout logic
 * - Descriptive error handling for HTTP >= 400
 * - Consistent fetch() POST method with JSON body
 */

// Constants
const API_BASE = 'https://o5rl18o91h.execute-api.eu-central-1.amazonaws.com/prod';
const REQUEST_TIMEOUT = 10000; // 10 seconds in milliseconds

/**
 * Helper function to make API calls with timeout
 * @param {string} endpoint - The API endpoint path (e.g., '/clubs')
 * @param {object} body - The request body to send as JSON
 * @returns {Promise<object>} - The parsed JSON response
 * @throws {Error} - Descriptive error on HTTP >= 400 or timeout
 */
async function makeRequest(endpoint, body) {
  const url = `${API_BASE}${endpoint}`;
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    // Clear timeout if request completed
    clearTimeout(timeoutId);
    
    // Check for HTTP errors (>= 400)
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      
      // Try to extract error details from response body
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = `${errorMessage}: ${errorData.message}`;
        } else if (errorData.error) {
          errorMessage = `${errorMessage}: ${errorData.error}`;
        }
      } catch (e) {
        // If response body is not JSON, use default error message
      }
      
      throw new Error(`API Error on ${endpoint}: ${errorMessage}`);
    }
    
    // Parse and return response
    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle abort (timeout)
    if (error.name === 'AbortError') {
      throw new Error(`Request to ${endpoint} timed out after ${REQUEST_TIMEOUT / 1000} seconds`);
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Fetch all 18 Bundesliga clubs with hex colors
 * @returns {Promise<object>} - { clubs: [{club_id, name, short_name, three_letter_code, primary_color, secondary_color}] }
 */
export async function fetchClubs() {
  return makeRequest('/clubs', {});
}

/**
 * Generate personalized Wrapped card with profile, MVP analysis, and scout report
 * @param {string} favorite_club - User's favorite club name
 * @param {string} user_name - User's name
 * @param {string} tactical_style - User's tactical preference (High Press, Possession, Counter-Attack)
 * @returns {Promise<object>} - { user_name, favorite_club, tactical_style, profile, mvp_analysis, scout_report, wrapped_card }
 */
export async function fetchWrapped(favorite_club, user_name, tactical_style) {
  return makeRequest('/wrapped', {
    favorite_club,
    user_name,
    tactical_style,
  });
}

/**
 * Fetch top 3 Bayern MVP players ranked by Impact Score
 * @returns {Promise<object>} - { club, note, players: [{name, impact_score, goal_participations, xg, xg_efficiency, distance_per90_km, max_speed_kmh, season_label}] }
 */
export async function fetchMVP() {
  return makeRequest('/mvp', {});
}

/**
 * Fetch bench players for a given match and team
 * @param {string} match_id - The match ID
 * @param {string} team_id - The team ID
 * @returns {Promise<object>} - { match_id, team_id, result, formation, bench: [{person_id, name, shirt_number, playing_position, has_season_stats}] }
 */
export async function fetchSubstitution(match_id, team_id) {
  return makeRequest('/substitution', {
    match_id,
    team_id,
  });
}

/**
 * Analyze a proposed substitution using Bedrock tactical analysis
 * @param {string} match_id - The match ID
 * @param {string} team_id - The team ID
 * @param {string} starter_person_id - The starting player's person ID
 * @param {string} bench_person_id - The bench player's person ID
 * @returns {Promise<object>} - { match_id, match_day, opponent, result, starter, bench_player, has_deep_stats, starter_stats, bench_stats, analysis }
 */
export async function fetchAnalyzeSub(match_id, team_id, starter_person_id, bench_person_id) {
  return makeRequest('/analyze-sub', {
    match_id,
    team_id,
    starter_person_id,
    bench_person_id,
  });
}

// Export constants for use in components
export { API_BASE, REQUEST_TIMEOUT };
