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

export function parseDailyEmailResponse(body: string): ParsedDailyResponse {
  const text = body.toLowerCase().trim();

  if (text.includes("no to all")) {
    return {
      walking_10k: false,
      walking_after_meals: false,
      pushups: 0,
      plank: false,
      plank_time: null,
      brainstorming: false,
    };
  }

  const result: ParsedDailyResponse = {
    walking_10k: true,
    walking_after_meals: true,
    pushups: 10,
    plank: true,
    plank_time: null,
    brainstorming: true,
  };

  if (text.includes("yes to all but")) {
    const after = text.split("yes to all but")[1];
    const exclusions = after.split(",").map((s) => s.trim());

    for (const ex of exclusions) {
      if (ex.includes("10k") || ex.includes("walking-10k"))
        result.walking_10k = false;
      if (ex.includes("after meal") || ex.includes("walking-after"))
        result.walking_after_meals = false;
      if (ex.includes("pushup")) result.pushups = 0;
      if (ex.includes("plank")) result.plank = false;
      if (ex.includes("brainstorm")) result.brainstorming = false;
    }
  }

  const pushupMatch = text.match(/pushups?:\s*(\d+)/);
  if (pushupMatch) result.pushups = parseInt(pushupMatch[1]);

  const plankMatch = text.match(/plank:\s*(\d+)\s*s?/);
  if (plankMatch) {
    result.plank = true;
    result.plank_time = parseInt(plankMatch[1]);
  }

  return result;
}

export function parseWeeklyEmailResponse(body: string): ParsedWeeklyResponse {
  const text = body.toLowerCase().trim();

  if (text.includes("no to all")) {
    return { yoga: false, pilates: false, weightlifting: 0 };
  }

  const result: ParsedWeeklyResponse = {
    yoga: true,
    pilates: true,
    weightlifting: 2,
  };

  if (text.includes("yes to all but")) {
    const after = text.split("yes to all but")[1];
    const exclusions = after.split(",").map((s) => s.trim());

    for (const ex of exclusions) {
      if (ex.includes("yoga")) result.yoga = false;
      if (ex.includes("pilates")) result.pilates = false;
      if (ex.includes("weightlift") || ex.includes("weight"))
        result.weightlifting = 0;
    }
  }

  const yogaMatch = text.match(/yoga:\s*(yes|no)/);
  if (yogaMatch) result.yoga = yogaMatch[1] === "yes";

  const pilatesMatch = text.match(/pilates:\s*(yes|no)/);
  if (pilatesMatch) result.pilates = pilatesMatch[1] === "yes";

  const weightMatch = text.match(/weightlifting:\s*(\d+)/);
  if (weightMatch) result.weightlifting = parseInt(weightMatch[1]);

  return result;
}
