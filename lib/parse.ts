export interface ParsedDailyResponse {
  walking_10k: boolean;
  walking_after_meals: boolean;
  pushups: number;
  plank: boolean;
  plank_time: number | null;
  brainstorming: boolean;
}

export interface ParsedWeeklyResponse {
  yoga: boolean;
  pilates: boolean;
  weightlifting: number;
}

type DailyGoalKey = "walking_10k" | "walking_after_meals" | "pushups" | "plank" | "brainstorming";

const DAILY_MATCHERS: { key: DailyGoalKey; patterns: RegExp[] }[] = [
  {
    key: "walking_after_meals",
    patterns: [
      /walk(ed)?\s*(after|post)\s*meal/,
      /after\s*meal\s*walk/,
      /post[\s-]meal/,
    ],
  },
  {
    key: "walking_10k",
    patterns: [
      /10k/,
      /10,?000\s*step/,
      /walk(ed)?\s*(a\s*lot|10k|my\s*steps)/,
      /hit\s*(my\s*)?steps/,
      /\bwalking\b(?!.*after\s*meal)/,
      /\bwalked\b(?!.*after\s*meal)/,
    ],
  },
  {
    key: "pushups",
    patterns: [
      /push[\s-]?ups?/,
      /did\s+\d+\s+push/,
    ],
  },
  {
    key: "plank",
    patterns: [
      /plank(ed|s)?/,
    ],
  },
  {
    key: "brainstorming",
    patterns: [
      /brainstorm(ed|ing)?/,
      /brain\s*storm/,
    ],
  },
];

function detectMentionedGoals(text: string): Set<DailyGoalKey> {
  const found = new Set<DailyGoalKey>();
  for (const { key, patterns } of DAILY_MATCHERS) {
    if (patterns.some((p) => p.test(text))) {
      found.add(key);
    }
  }
  return found;
}

function isExclusionMode(text: string): boolean {
  return (
    /everything\s*(except|but)/.test(text) ||
    /all\s*(except|but)/.test(text) ||
    /yes\s*to\s*all\s*but/.test(text) ||
    /did\s*it\s*all\s*(except|but)/.test(text) ||
    /skip(ped)?/.test(text) ||
    /miss(ed)?/.test(text) ||
    /didn.t\s*(do)?/.test(text) ||
    /not\s/.test(text) ||
    /except/.test(text)
  );
}

function isInclusionMode(text: string): boolean {
  return (
    /^only\b/.test(text) ||
    /^just\b/.test(text) ||
    /^did\b/.test(text) ||
    /^i\s+(only|just)\b/.test(text)
  );
}

export function parseDailyEmailResponse(body: string): ParsedDailyResponse {
  const text = body.toLowerCase().trim();

  const result: ParsedDailyResponse = {
    walking_10k: false,
    walking_after_meals: false,
    pushups: 0,
    plank: false,
    plank_time: null,
    brainstorming: false,
  };

  // "no to all" / "nothing" / "nope" / "0/5"
  if (/^(no(pe|thing)?|0\/5|didn.t do anything|none)/.test(text) || text.includes("no to all")) {
    return result;
  }

  // "yes to all" / "did everything" / "all done" / "5/5"
  if (
    /^(yes(\s*to\s*all)?|all\s*done|did\s*(everything|it\s*all|them\s*all)|5\/5|crushed it|perfect day)/.test(text) &&
    !isExclusionMode(text)
  ) {
    return {
      walking_10k: true,
      walking_after_meals: true,
      pushups: 10,
      plank: true,
      plank_time: null,
      brainstorming: true,
    };
  }

  const mentioned = detectMentionedGoals(text);

  if (isExclusionMode(text)) {
    // "did everything except pushups" → all true, mentioned ones false
    result.walking_10k = true;
    result.walking_after_meals = true;
    result.pushups = 10;
    result.plank = true;
    result.brainstorming = true;

    for (const key of mentioned) {
      if (key === "pushups") {
        result.pushups = 0;
      } else {
        result[key] = false;
      }
    }
  } else if (isInclusionMode(text) || mentioned.size > 0) {
    // "only walked after meals" → only mentioned ones true
    for (const key of mentioned) {
      if (key === "pushups") {
        result.pushups = 10;
      } else {
        result[key] = true;
      }
    }
  }

  // Parse specific values: "pushups: 15", "20 pushups"
  const pushupMatch = text.match(/push[\s-]?ups?:?\s*(\d+)/) || text.match(/(\d+)\s*push[\s-]?ups?/);
  if (pushupMatch) result.pushups = parseInt(pushupMatch[1]);

  // Parse plank time: "plank: 90s", "90 second plank", "planked for 2 min"
  const plankSecondsMatch = text.match(/plank(?:ed)?[:\s]*(\d+)\s*s(?:ec)?/) || text.match(/(\d+)\s*s(?:ec)?\s*plank/);
  const plankMinMatch = text.match(/plank(?:ed)?(?:\s*for)?\s*(\d+)\s*min/) || text.match(/(\d+)\s*min(?:ute)?\s*plank/);
  if (plankSecondsMatch) {
    result.plank = true;
    result.plank_time = parseInt(plankSecondsMatch[1]);
  } else if (plankMinMatch) {
    result.plank = true;
    result.plank_time = parseInt(plankMinMatch[1]) * 60;
  }

  return result;
}

type WeeklyGoalKey = "yoga" | "pilates" | "weightlifting";

const WEEKLY_MATCHERS: { key: WeeklyGoalKey; patterns: RegExp[] }[] = [
  { key: "yoga", patterns: [/yoga/] },
  { key: "pilates", patterns: [/pilates/] },
  {
    key: "weightlifting",
    patterns: [/weight(?:lift|s|ed)?/, /lift(ed|ing)?/, /gym/],
  },
];

function detectWeeklyGoals(text: string): Set<WeeklyGoalKey> {
  const found = new Set<WeeklyGoalKey>();
  for (const { key, patterns } of WEEKLY_MATCHERS) {
    if (patterns.some((p) => p.test(text))) found.add(key);
  }
  return found;
}

export function parseWeeklyEmailResponse(body: string): ParsedWeeklyResponse {
  const text = body.toLowerCase().trim();

  if (/^(no(pe|thing)?|none|0|didn.t)/.test(text) || text.includes("no to all")) {
    return { yoga: false, pilates: false, weightlifting: 0 };
  }

  if (
    /^(yes(\s*to\s*all)?|all\s*done|did\s*(everything|it\s*all|them\s*all))/.test(text) &&
    !isExclusionMode(text)
  ) {
    return { yoga: true, pilates: true, weightlifting: 2 };
  }

  const result: ParsedWeeklyResponse = { yoga: false, pilates: false, weightlifting: 0 };
  const mentioned = detectWeeklyGoals(text);

  if (isExclusionMode(text)) {
    result.yoga = true;
    result.pilates = true;
    result.weightlifting = 2;
    for (const key of mentioned) {
      if (key === "weightlifting") result.weightlifting = 0;
      else result[key] = false;
    }
  } else {
    for (const key of mentioned) {
      if (key === "weightlifting") result.weightlifting = 2;
      else result[key] = true;
    }
  }

  // Specific values: "yoga: yes", "weightlifting: 3", "lifted 3 times"
  const yogaMatch = text.match(/yoga:\s*(yes|no)/);
  if (yogaMatch) result.yoga = yogaMatch[1] === "yes";

  const pilatesMatch = text.match(/pilates:\s*(yes|no)/);
  if (pilatesMatch) result.pilates = pilatesMatch[1] === "yes";

  const weightMatch = text.match(/weight(?:lift(?:ing|ed)?)?:?\s*(\d+)/) || text.match(/lift(?:ed)?\s*(\d+)\s*time/);
  if (weightMatch) result.weightlifting = parseInt(weightMatch[1]);

  return result;
}
