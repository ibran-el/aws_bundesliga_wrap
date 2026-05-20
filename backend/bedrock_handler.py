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
    Stage 3: Personal Wrapped card for the fan.
    Stats are from ONE real fan's individual records — not averages.
    Presented in first-person "you" exactly like Spotify Wrapped.

    DATA REFERENCE:
    - engagement_score = percentile rank within club (0–99)
    - total_videos/stories/articles = real totals across active months
    - favorite_video = most frequent title in their own records
    - active_months = 1–12 (number of monthly records for this user)
    """
    user_name      = user_profile.get('user_name') or 'Manager'
    archetype      = user_profile.get('archetype') or 'Casual Observer'
    club           = user_profile.get('favorite_club') or 'Unknown'
    top_platform   = user_profile.get('platform') or 'the app'
    country        = user_profile.get('country') or ''
    active_months  = user_profile.get('active_months') or 0
    total_interact = user_profile.get('total_interactions') or 0
    total_videos   = user_profile.get('total_videos') or 0
    total_stories  = user_profile.get('total_stories') or 0
    total_mc       = user_profile.get('total_match_center') or 0
    fav_video      = user_profile.get('favorite_video') or None
    fan_percentile = user_profile.get('fan_percentile') or 0
    fan_count      = user_profile.get('fan_count') or 0

    # New KPI fields for Fan Identity (Story 9) and Fan DNA
    match_center_persona  = user_profile.get('match_center_persona') or 'Live Wire'
    peak_month            = user_profile.get('peak_month') or ''
    peak_month_range      = user_profile.get('peak_month_matchday_range') or ''
    content_diet_type     = user_profile.get('content_diet_type') or 'Highlight Addict'
    arc_shape             = user_profile.get('arc_shape') or 'Rollercoaster'
    loyalty_class         = user_profile.get('loyalty_class') or ''
    global_rank           = user_profile.get('global_rank') or 0
    global_rank_position  = user_profile.get('global_rank_position') or 0
    country_rank          = user_profile.get('country_rank') or 0
    age_rank              = user_profile.get('age_rank') or 0
    age_group             = user_profile.get('age_group') or ''
    country_in_profile    = user_profile.get('country') or country
    is_international      = user_profile.get('is_international') or False
    locale_class          = user_profile.get('locale_class') or ''
    supermatch_month      = user_profile.get('supermatch_month') or ''
    supermatch_context    = user_profile.get('supermatch_context') or ''
    ticker_total          = user_profile.get('ticker_total') or 0
    stats_total_kpi       = user_profile.get('stats_total') or 0
    lineups_total         = user_profile.get('lineups_total') or 0
    completionist         = user_profile.get('completionist') or False
    planning_style        = user_profile.get('planning_style') or ''
    table_persona         = user_profile.get('table_persona') or ''
    max_streak            = user_profile.get('max_streak') or 0
    streak_period         = user_profile.get('streak_period') or ''
    loyalty_label         = loyalty_class or arc_shape

    fav_video_line = (
        f"- Most-watched video title: '{fav_video}'"
        if fav_video else
        "- No favourite video recorded this season"
    )

    # Format peak month label for Bedrock (convert YYYY-MM-DD to human-readable)
    peak_month_label = peak_month[:7] if peak_month else 'N/A'  # YYYY-MM

    # Fan Identity Signals section for Bedrock prompt
    fan_identity_section = f"""
Fan Identity Signals (use ALL FOUR in fan_identity_statement):
- Match Center Persona: {match_center_persona} (Ticker: {ticker_total}, Stats: {stats_total_kpi}, Lineups: {lineups_total})
- Peak Month: {peak_month_label} ({peak_month_range})
- Content Diet: {content_diet_type}{' — Completionist badge: consumed all content types' if completionist else ''}
- Season Arc: {arc_shape} · Loyalty: {loyalty_label}

Fan DNA context (use in fan_dna_statement):
- Global rank: #{global_rank_position} out of ~2,765 Bundesliga app fans ({global_rank}/99 percentile)
- Country rank: {country_rank}/99 among {club} fans in {country_in_profile or 'their country'}
- Age rank: {age_rank}/99 among {club} fans aged {age_group or 'unknown age group'}
- Fan type: {locale_class}{' (international supporter)' if is_international else ''}
- Planning style: {planning_style} · Standings obsession: {table_persona}
- Supermatch month: {peak_month_label} — {supermatch_context}
- Streak: {max_streak} consecutive active months{(' (' + streak_period + ')') if streak_period else ''}

Additional output instructions:
- Add "fan_identity_statement": exactly ONE sentence in second person ("You are..." or "Your season...") that references all four Fan Identity Signals (match_center_persona, peak month, content_diet_type, arc_shape). Maximum one sentence.
- Add "fan_dna_statement": exactly ONE shareable sentence using the Fan DNA context (global rank position, loyalty class, supermatch month). Maximum one sentence.
"""

    prompt = f"""You are writing a Bundesliga Wrapped card — exactly like Spotify Wrapped but for football.
The fan's name is {user_name}. Write every line as if these stats are THEIRS personally.
Use "you" and "your" throughout. These are REAL numbers from one real fan's Bundesliga app history.

THE FAN:
- Name: {user_name}
- Club: {club}
- Fan archetype: {archetype}
- Country: {country or 'unknown'}
- Platform: {top_platform}
- Active months this season: {active_months}

THEIR 2024/25 SEASON IN THE BUNDESLIGA APP (real individual data):
- {total_videos:,} videos watched
- {total_stories:,} stories read
- {total_mc:,} Match Center visits
- {total_interact:,} total interactions
{fav_video_line}
- Fan Score: {fan_percentile}/100 (percentile rank among {fan_count:,} {club} fans)

SEASON MVP (data-declared by Z-score Impact Score): {scout_report.get('headline', 'Top performer')}

RULES — make it feel PERSONAL and HONEST:
1. Greeting MUST say "{user_name}" by name and reference their archetype
2. season_story tells {user_name}'s story using THEIR specific numbers — not generic statements
3. fan_stat picks the most interesting of their numbers and contextualises it against the community
   — e.g. "Your {fan_percentile}/100 Fan Score puts you in the top {100-fan_percentile}% of {club} fans"
4. tactical_identity is about how {user_name} engages with {club} — derived from their behaviour pattern
5. season_verdict max 12 words — honest about who they are, not inflated
6. share_text is something {user_name} would actually post — include real numbers and #BundesligaWrapped
{fan_identity_section}
Respond ONLY with valid JSON. No preamble. No markdown.
{{
  "greeting": "personal opener using {user_name} and their archetype",
  "season_story": "2-3 sentences to {user_name} using their real stats",
  "fan_stat": "percentile insight or most impressive specific number with context",
  "tactical_identity": "what {user_name}'s behaviour pattern says about how they follow football",
  "season_verdict": "max 12 words — honest season summary for this specific fan",
  "share_text": "tweet-ready with real numbers and #BundesligaWrapped",
  "fan_identity_statement": "one sentence in second person referencing match_center_persona, peak month, content_diet_type, arc_shape",
  "fan_dna_statement": "one shareable sentence using global rank, loyalty class, and supermatch month"
}}"""

    raw = _invoke(prompt, max_tokens=700)

    fallback = {
        "greeting":
            f"{user_name}, the {archetype} — your 2024/25 Bundesliga Wrapped is here.",
        "season_story": (
            f"This season, {user_name}, you watched {total_videos:,} videos, "
            f"read {total_stories:,} stories and visited Match Center {total_mc:,} times "
            f"across {active_months} active months. That's {total_interact:,} moments "
            f"living and breathing {club}."
        ),
        "fan_stat": (
            f"Your Fan Score of {fan_percentile}/100 places you in the top "
            f"{max(1, 100 - fan_percentile)}% of {club} fans on the app."
            if fan_percentile > 0 else
            f"You racked up {total_interact:,} interactions — every single one counted."
        ),
        "tactical_identity": (
            f"You're a {archetype} — your match data doesn't lie. "
            f"Whether it's stats, lineups or highlights, {club} is always on your screen."
        ),
        "season_verdict":
            f"{user_name}. {club}. {active_months} months. {fan_percentile}/100.",
        "share_text": (
            f"My #BundesligaWrapped: {total_videos:,} videos, "
            f"{total_mc:,} Match Center visits, Fan Score {fan_percentile}/100. "
            f"Proud {archetype}. #Bundesliga"
        ),
        "fan_identity_statement": (
            f"You are a {match_center_persona} whose season peaked in {peak_month_label}, "
            f"a true {content_diet_type} who ran a {arc_shape} season arc."
        ),
        "fan_dna_statement": (
            f"Ranked #{global_rank_position} of ~2,765 global fans, your {loyalty_label} "
            f"devotion peaked during {supermatch_context or peak_month_label}."
        ),
    }
    wrapped = _parse_json_response(raw, fallback)
    # Inject fan identity fallbacks if absent from Bedrock response
    if 'fan_identity_statement' not in wrapped:
        wrapped['fan_identity_statement'] = fallback['fan_identity_statement']
    if 'fan_dna_statement' not in wrapped:
        wrapped['fan_dna_statement'] = fallback['fan_dna_statement']
    return wrapped

    fav_video_line = (
        f"- Most-watched video: '{fav_video}'"
        if fav_video else
        "- Most-watched content: match highlights"
    )

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
        "mvp_analysis": analysis,
        "scout_report": scout,
        "wrapped_card": wrapped,
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