# backend/bedrock_handler.py
"""
2-stage Bedrock prompt chain.
Stage 1 (Analyst): stats → JSON differentiators
Stage 2 (Narrator): differentiators + user profile → narrative cards

Single responsibility: context bundle → narrative output.
No S3 calls. No stats logic.
"""

import boto3
import json
from config import (
    BEDROCK_REGION, BEDROCK_MODEL_PRIMARY, BEDROCK_MODEL_FALLBACK,
    BEDROCK_MAX_TOKENS, BEDROCK_ANTHROPIC_VER, USE_FALLBACK_RESPONSES,
    FALLBACK_DIR
)

client = boto3.client('bedrock-runtime', region_name=BEDROCK_REGION)


# ── JSON PARSING HELPER ──────────────────────────────────────────────

def _parse_json_response(raw: str, fallback: dict) -> dict:
    """
    Safely parse JSON from Bedrock response, handling markdown formatting.
    """
    try:
        # Try direct parse first
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        pass
    
    # Strip markdown code blocks
    clean = raw.strip()
    
    # Handle triple backticks with optional language specifier
    if clean.startswith('```'):
        lines = clean.split('\n')
        # Remove opening ``` and optional language specifier
        if lines[0].startswith('```'):
            lines = lines[1:]
        # Remove closing ```
        if lines and lines[-1].strip() == '```':
            lines = lines[:-1]
        clean = '\n'.join(lines).strip()
    
    # Handle indented code blocks (4 spaces)
    if clean.startswith('    '):
        lines = clean.split('\n')
        clean = '\n'.join(line[4:] if line.startswith('    ') else line for line in lines)
    
    try:
        return json.loads(clean)
    except json.JSONDecodeError as e:
        print(f"[bedrock] JSON parse failed: {e}\nRaw: {raw}")
        return fallback


# ── CORE INVOKER ─────────────────────────────────────────────────────

def _invoke(prompt: str, max_tokens: int = BEDROCK_MAX_TOKENS,
            system: str = None) -> str:
    """
    Invokes Bedrock using the universal Converse API. 
    Tries primary model (Nova), falls back to secondary if error.
    """
    if USE_FALLBACK_RESPONSES:
        # Assuming you have a fallback loader in your project
        from tests.fallback_loader import _load_fallback 
        return _load_fallback('generic')

    # The new Converse API format
    messages = [{"role": "user", "content": [{"text": prompt}]}]
    system_prompts = [{"text": system}] if system else []

    try:
        response = client.converse(
            modelId=BEDROCK_MODEL_PRIMARY,
            messages=messages,
            system=system_prompts,
            inferenceConfig={"maxTokens": max_tokens}
        )
        return response['output']['message']['content'][0]['text']
        
    except Exception as e:
        print(f"[bedrock] Primary model failed: {e}. Trying fallback...")
        try:
            response = client.converse(
                modelId=BEDROCK_MODEL_FALLBACK,
                messages=messages,
                system=system_prompts,
                inferenceConfig={"maxTokens": max_tokens}
            )
            return response['output']['message']['content'][0]['text']
        except Exception as fallback_e:
            print(f"[bedrock] Fallback failed: {fallback_e}")
            raise

    return _load_fallback('generic')


def _load_fallback(key: str) -> str:
    try:
        with open(f"{FALLBACK_DIR}{key}.json") as f:
            return f.read()
    except Exception:
        return '{"error": "fallback not available"}'


# ── STAGE 1 — ANALYST ────────────────────────────────────────────────

def analyze_mvp(top_players: list[dict]) -> dict:
    """
    Stage 1: Takes top 3 players by Impact Score.
    Returns JSON with top 3 stat differentiators per player.
    """
    # Build compact stat summary — only signal fields
    player_summaries = []
    for p in top_players[:3]:
        player_summaries.append({
            "name": f"{p['first_name']} {p['last_name']}",
            "impact_score": p['impact_score'],
            "goal_participations": p['participations_goal'],
            "xg": round(p['xg'], 2),
            "xg_efficiency": round(p['xg_efficiency'], 2),
            "assists": p['assists_shot_at_goal'],
            "distance_per90_km": round(p['dist_per90'] / 1000, 2),
            "max_speed_kmh": p['maximum_speed'],
            "duels_won": p['duels_won'],
        })

    prompt = f"""You are a professional football data analyst.
Given these Bayern München player season statistics, identify the 
top 3 statistical differentiators that explain why each player 
ranked where they did.

Players (ranked by composite Impact Score):
{json.dumps(player_summaries, indent=2)}

Respond ONLY with valid JSON. No preamble. No markdown. 
Exact format:
{{
  "mvp": "Full Name",
  "mvp_reason": "one sentence, stats-grounded",
  "differentiators": [
    {{
      "player": "Full Name",
      "rank": 1,
      "key_stats": ["stat1 with value", "stat2 with value", "stat3 with value"]
    }}
  ]
}}"""

    raw = _invoke(prompt, max_tokens=500)

    fallback = {
        "mvp": top_players[0]['last_name'],
        "mvp_reason": "Top composite Impact Score",
        "differentiators": []
    }
    return _parse_json_response(raw, fallback)


# ── STAGE 2 — NARRATOR ───────────────────────────────────────────────

def generate_scout_report(analysis: dict,
                           top_players: list[dict]) -> dict:
    """
    Stage 2: Takes Stage 1 analysis output.
    Returns witty, fan-facing Scout Report for top player.
    """
    prompt = f"""You are a witty football scout writing for fans.
Based on this season analysis of Bayern München's top performer:

MVP: {analysis.get('mvp')}
Reason: {analysis.get('mvp_reason')}
Key stats: {json.dumps(analysis.get('differentiators', [{}])[0].get('key_stats', []))}

Write a Scout Report card with exactly these fields.
Respond ONLY with valid JSON. No preamble. No markdown.
{{
  "headline": "punchy 6-8 word headline",
  "scout_report": "exactly 3 sentences, witty, stat-grounded, shareable",
  "season_label": "creative 3-4 word season descriptor e.g. The Relentless Finisher",
  "shareable_line": "one tweet-length line a fan would actually share"
}}"""

    raw = _invoke(prompt, max_tokens=400)

    fallback = {
        "headline": f"{analysis.get('mvp')} — Season Standout",
        "scout_report": analysis.get('mvp_reason', ''),
        "season_label": "The Standout",
        "shareable_line": f"{analysis.get('mvp')} was Bayern's best. The data agrees."
    }
    return _parse_json_response(raw, fallback)


# ── STAGE 3 — WRAPPED CARD ───────────────────────────────────────────

def generate_wrapped_card(user_profile: dict,
                           scout_report: dict,
                           tactical_style: str) -> dict:
    """
    Stage 3: Personalized Wrapped card for the judge/user.
    This is the live call during demo — most visible Bedrock output.
    """
    prompt = f"""You are writing a personalized Bundesliga season recap 
for a football fan. Make it feel personal, exciting, and shareable —
like Spotify Wrapped but for football.

Fan profile:
- Favorite club: {user_profile.get('favorite_club', 'Unknown')}
- Fan archetype: {user_profile.get('archetype', 'Casual Observer')}
- Active months this season: {user_profile.get('active_months', 0)}
- Total content consumed: {user_profile.get('total_interactions', 0)} interactions
- Top video watched: {user_profile.get('favorite_video', 'match highlights')}
- Preferred style: {tactical_style}
- Engagement score: {user_profile.get('engagement_score', 0)}/100

This season's Bayern MVP by data: {scout_report.get('headline', '')}

Write their personalized Wrapped card.
Respond ONLY with valid JSON. No preamble. No markdown.
{{
  "greeting": "personal opening line using their archetype",
  "season_story": "2-3 sentences recapping their season as a fan",
  "fan_stat": "one surprising personalised stat about their app behaviour",
  "tactical_identity": "their tactical style translated to a football philosophy",
  "season_verdict": "one punchy final line — their season in 10 words or less",
  "share_text": "what they would post on social media about their wrapped"
}}"""

    raw = _invoke(prompt, max_tokens=600)

    fallback = {
        "greeting": f"Welcome, {user_profile.get('archetype', 'fan')}",
        "season_story": "You followed every moment this season.",
        "fan_stat": f"{user_profile.get('total_interactions', 0)} interactions this season.",
        "tactical_identity": tactical_style,
        "season_verdict": "One season. Unforgettable.",
        "share_text": "My Bundesliga Wrapped is here."
    }
    return _parse_json_response(raw, fallback)


# ── FULL PIPELINE ────────────────────────────────────────────────────

def run_full_pipeline(top_players: list[dict],
                      user_profile: dict,
                      tactical_style: str) -> dict:
    """
    Runs all 3 stages in sequence.
    Returns complete output bundle for frontend.
    """
    print("[bedrock] Stage 1 — analyzing MVP...")
    analysis = analyze_mvp(top_players)

    print("[bedrock] Stage 2 — generating scout report...")
    scout = generate_scout_report(analysis, top_players)

    print("[bedrock] Stage 3 — generating wrapped card...")
    wrapped = generate_wrapped_card(user_profile, scout, tactical_style)

    return {
        "mvp_analysis":  analysis,
        "scout_report":  scout,
        "wrapped_card":  wrapped,
    }

def analyze_substitution(
    match_context: dict,
    starter: dict,
    bench_player: dict,
    starter_stats: dict,
    bench_stats: dict
) -> dict:
    """
    Analyzes a user's proposed substitution against real match data.
    Returns: impact delta, verdict, risk, comparison to actual result.
    """

    # Build stat delta with safe extraction
    def safe(d, k):
        """Safely extract numeric value from dict, default to 0."""
        if not d:
            return 0.0
        val = d.get(k, 0)
        if val is None:
            return 0.0
        try:
            return round(float(val), 2)
        except (ValueError, TypeError):
            return 0.0

    # Validate stats exist before calculating deltas
    if not starter_stats or not bench_stats:
        # Return neutral analysis if stats missing
        return {
            "synergy_score": 0,
            "verdict": "Insufficient season data for comparison.",
            "risk": "Limited statistical basis for analysis.",
            "manager_rating": "Data-Limited Assessment",
            "real_time_note": "Rich stats available for Bayern players only."
        }

    delta_impact   = safe(bench_stats, 'impact_score') - safe(starter_stats, 'impact_score')
    delta_xg       = safe(bench_stats, 'xg') - safe(starter_stats, 'xg')
    delta_dist     = safe(bench_stats, 'dist_per90') - safe(starter_stats, 'dist_per90')
    delta_goals    = safe(bench_stats, 'participations_goal') - safe(starter_stats, 'participations_goal')

    # Check position compatibility
    starter_pos = starter.get('playing_position', '').upper()
    bench_pos = bench_player.get('playing_position', '').upper()
    position_mismatch = starter_pos != bench_pos

    if position_mismatch:
        print(f"[bedrock] Position mismatch: {starter_pos} → {bench_pos}")

    prompt = f"""You are an expert Bundesliga tactical analyst with access to real season data.

A fan is playing Manager Mode — they are second-guessing the real coaching decision in this match.

MATCH CONTEXT:
- Match Day: {match_context.get('match_day')}
- Opponent: {match_context.get('opponent')}
- Actual Result: {match_context.get('result')} (Bayern perspective)
- Bayern Formation: {match_context.get('formation')}

POSITION COMPATIBILITY:
- Starter position: {starter_pos}
- Bench player position: {bench_pos}
- Position match: {'Yes' if not position_mismatch else 'No (tactical adjustment required)'}

ACTUAL STARTER (who the fan wants to remove):
- Name: {starter.get('name')}
- Position: {starter.get('playing_position')}
- Season Impact Score: {safe(starter_stats,'impact_score')}/100
- Season xG: {safe(starter_stats,'xg')}
- Goal participations: {safe(starter_stats,'participations_goal')}
- Distance/90: {round(safe(starter_stats,'dist_per90')/1000,2)}km

PROPOSED SUBSTITUTE (who the fan wants to bring on):
- Name: {bench_player.get('name')}
- Position: {bench_player.get('playing_position')}
- Season Impact Score: {safe(bench_stats,'impact_score')}/100
- Season xG: {safe(bench_stats,'xg')}
- Goal participations: {safe(bench_stats,'participations_goal')}
- Distance/90: {round(safe(bench_stats,'dist_per90')/1000,2)}km

STAT DELTAS (substitute minus starter):
- Impact Score delta: {round(delta_impact,2)}
- xG delta: {round(delta_xg,2)}
- Goal participation delta: {round(delta_goals,2)}
- Distance/90 delta: {round(delta_dist/1000,2)}km

The actual match ended: {match_context.get('result')}.
Analyze whether this substitution would have been tactically sound given the match context and season profiles.

Respond ONLY with valid JSON. No preamble. No markdown.
{{
  "synergy_score": <integer -10 to +10, positive means sub improves team>,
  "verdict": "<2 sentences: would this sub have helped? grounded in the stat deltas>",
  "risk": "<1 sentence: what tactical risk does this substitution introduce?>",
  "manager_rating": "<creative label for this decision e.g. 'Tactical Genius' / 'Brave Call' / 'Questionable'>",
  "real_time_note": "<1 sentence: how this decision might differ if made at a specific match minute vs end of game>"
}}"""

    raw = _invoke(prompt, max_tokens=500)

    try:
        clean = raw.strip()
        if clean.startswith('```'):
            clean = clean.split('```')[1]
            if clean.startswith('json'):
                clean = clean[4:]
        return json.loads(clean.strip())
    except json.JSONDecodeError as e:
        print(f"[bedrock] substitution JSON parse failed: {e}\nRaw: {raw}")
        return {
            "synergy_score": round(delta_impact / 10) if delta_impact != 0 else 0,
            "verdict": f"Based on season profiles, {bench_player.get('name')} has an Impact Score delta of {round(delta_impact,1)} vs {starter.get('name')}.",
            "risk": "Position mismatch may disrupt team shape." if position_mismatch else "Tactical adjustment required.",
            "manager_rating": "Tactical Thinker",
            "real_time_note": "Timing of substitution significantly affects match dynamics."
        }