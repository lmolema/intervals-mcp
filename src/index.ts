import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { IntervalsClient } from "./intervals-client.js";

const apiKey = process.env.INTERVALS_API_KEY;
const athleteId = process.env.INTERVALS_ATHLETE_ID || "0";

if (!apiKey) {
  console.error("INTERVALS_API_KEY environment variable is required");
  process.exit(1);
}

const client = new IntervalsClient(apiKey, athleteId);

const server = new McpServer({
  name: "intervals-icu",
  version: "1.0.0",
});

const athleteIdParam = z
  .string()
  .describe("Athlete ID (e.g. i12345). Omit to use your own account. Use list_athletes to find IDs of coached athletes.")
  .optional();

// --- Tools ---

server.tool(
  "list_athletes",
  "List all athletes you coach. Returns their IDs and names so you can query their data.",
  {},
  async () => {
    const data = await client.getAthletes();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_athlete",
  "Get athlete profile info (weight, FTP, zones, etc.)",
  {
    athlete_id: athleteIdParam,
  },
  async ({ athlete_id }) => {
    const data = await client.getAthlete(athlete_id);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_activities",
  "List activities in a date range. Returns summary data for each activity.",
  {
    oldest: z.string().describe("Start date (yyyy-MM-dd)").optional(),
    newest: z.string().describe("End date (yyyy-MM-dd)").optional(),
    athlete_id: athleteIdParam,
  },
  async ({ oldest, newest, athlete_id }) => {
    const data = await client.getActivities(oldest, newest, athlete_id);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_activity",
  "Get detailed info for a single activity by ID",
  {
    activity_id: z.string().describe("Activity ID (e.g. i12345)"),
  },
  async ({ activity_id }) => {
    const data = await client.getActivity(activity_id);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_activity_streams",
  "Get time-series data streams for an activity (power, HR, cadence, etc.)",
  {
    activity_id: z.string().describe("Activity ID"),
    types: z
      .array(z.string())
      .describe(
        "Stream types to fetch: watts, heartrate, cadence, distance, altitude, velocity_smooth, latlng, time, temp, grade_smooth"
      )
      .optional(),
  },
  async ({ activity_id, types }) => {
    const data = await client.getActivityStreams(activity_id, types);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_activity_intervals",
  "Get intervals/laps for an activity",
  {
    activity_id: z.string().describe("Activity ID"),
  },
  async ({ activity_id }) => {
    const data = await client.getActivityIntervals(activity_id);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_wellness",
  "Get wellness data (weight, HRV, sleep, mood, etc.) for a date range",
  {
    oldest: z.string().describe("Start date (yyyy-MM-dd)").optional(),
    newest: z.string().describe("End date (yyyy-MM-dd)").optional(),
    athlete_id: athleteIdParam,
  },
  async ({ oldest, newest, athlete_id }) => {
    const data = await client.getWellness(oldest, newest, athlete_id);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_wellness_day",
  "Get wellness data for a specific day",
  {
    date: z.string().describe("Date (yyyy-MM-dd)"),
    athlete_id: athleteIdParam,
  },
  async ({ date, athlete_id }) => {
    const data = await client.getWellnessDay(date, athlete_id);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "update_wellness",
  "Update wellness data for a specific day (weight, sleep, mood, etc.)",
  {
    date: z.string().describe("Date (yyyy-MM-dd)"),
    data: z
      .record(z.string(), z.unknown())
      .describe(
        "Wellness fields to update. Possible fields: weight, restingHR, hrv, sleepSecs, sleepScore, sleepQuality, soreness, fatigue, stress, mood, motivation, kcalConsumed, comments, etc."
      ),
    athlete_id: athleteIdParam,
  },
  async ({ date, data, athlete_id }) => {
    const result = await client.updateWellness(date, data, athlete_id);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_events",
  "Get calendar events (planned workouts, notes, targets) for a date range",
  {
    oldest: z.string().describe("Start date (yyyy-MM-dd)").optional(),
    newest: z.string().describe("End date (yyyy-MM-dd)").optional(),
    athlete_id: athleteIdParam,
  },
  async ({ oldest, newest, athlete_id }) => {
    const data = await client.getEvents(oldest, newest, athlete_id);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_event",
  `Create a calendar event (workout, note, target). Use category WORKOUT for workouts.

IMPORTANT: For workouts, use the 'description' field with Intervals.icu workout text syntax.
The API automatically parses this into a structured workout. The date must include T00:00:00.

## Workout text syntax:
Each step starts with "-" (dash). Format: -duration intensity [options]

### Duration formats:
- Minutes: 10m, 15', 1h30m
- Seconds: 30s, 90"
- Distance: 400mtr, 1km, 5km, 1000mtr (IMPORTANT: "m" means minutes, use "mtr" or "km" for distance)

### Intensity targets (use athlete's zones/thresholds):
- Pace zones: Z1 pace, Z2 pace, Z3 pace, Z4 pace
- % of threshold pace: 75-85% pace, 92-97% pace
- Heart rate zones: Z1 HR, Z2 HR, Z3 HR
- % of LTHR: 80% LTHR
- Power zones: Z2, Z3 (for cycling)
- % of FTP: 75%, 80-90%
- Absolute watts: 200w, 180-220w

### Repeats:
CRITICAL: Repeat blocks MUST have a blank line before the Nx line. All steps with "-" under it belong to the repeat. A blank line after the last step ends the repeat block.

<blank line>
5x
-1000mtr Z3
-400mtr Z1
<blank line>

### Options:
- "press lap" at end of step = until_lap_press (for Garmin)
- ONLY use "press lap" on warmup and cooldown of hard interval sessions (e.g. 8x600mtr, 5x1000mtr) where the athlete wants to manually start the interval block.
- Do NOT use "press lap" for: easy runs, long runs, runs with tempo/marathon pace blocks, or any workout where each block has a fixed duration.

### IMPORTANT: Total duration must add up!
When a workout specifies a total duration (e.g. "50 min easy with 5x2min Z2"), you MUST calculate so all steps add up to that total.
Always verify: warmup + (reps × (work + recovery)) + cooldown = total duration.

### IMPORTANT: Center the hard blocks in the workout!
The work blocks should sit roughly in the middle of the workout. This means MORE warmup time than cooldown time.
Calculation: remaining_time = total - block_time. Warmup = ~2/3 of remaining. Cooldown = ~1/3 of remaining.
Example: DL 50' Z1 with 2x5' Z2:
- Block = 2x(5' Z2 + 5' Z1 recovery) = 20'. Remaining = 30'. Warmup = 20'. Cooldown = 10'.
- Result: 20' Z1 + 2x(5' Z2 + 5' Z1) + 10' Z1 = 50' total, blocks centered.

### Examples:

Easy 60min run:
-60' 75-85% pace

DL with tempo/zone blocks (60min, no press lap - fixed durations):
-15' Z1 pace
-15' Z2 pace
-15' Z3 pace
-15' Z1 pace

DL 50' Z1 + 5x2' Z2 (blocks centered, total 50'):
-17' Z1 pace

5x
-2' Z2 pace
-3' Z1 pace

-8' Z1 pace

Interval run (8x600):
-15' wu Z1 pace press lap

8x
-600mtr 94-98% pace
-90" rest Z1 pace

-15' cd Z1 pace press lap

Easy bike ride:
-90' 65-75%

Bike with sweet spot:
-15' wu 55%

3x
-10' 88-93%
-5' 55%

-10' cd 55%`,
  {
    category: z
      .enum(["WORKOUT", "NOTE", "TARGET", "RACE"])
      .describe("Event category"),
    name: z.string().describe("Event name"),
    start_date_local: z
      .string()
      .describe("Date+time for the event (yyyy-MM-ddT00:00:00)"),
    type: z
      .string()
      .describe("Sport type: Ride, Run, Swim, WeightTraining, etc.")
      .optional(),
    description: z
      .string()
      .describe(
        "Workout description in Intervals.icu text syntax. The API parses this automatically into a structured workout. See tool description for syntax."
      )
      .optional(),
    athlete_id: athleteIdParam,
  },
  async ({ category, name, start_date_local, type, description, athlete_id }) => {
    const event: Record<string, unknown> = {
      category,
      name,
      start_date_local,
    };
    if (type) event.type = type;
    if (description) event.description = description;
    const data = await client.createEvent(event, athlete_id);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "update_event",
  "Update an existing calendar event",
  {
    event_id: z.string().describe("Event ID"),
    data: z.record(z.string(), z.unknown()).describe("Fields to update on the event"),
    athlete_id: athleteIdParam,
  },
  async ({ event_id, data, athlete_id }) => {
    const result = await client.updateEvent(event_id, data, athlete_id);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "delete_event",
  "Delete a calendar event",
  {
    event_id: z.string().describe("Event ID"),
    athlete_id: athleteIdParam,
  },
  async ({ event_id, athlete_id }) => {
    await client.deleteEvent(event_id, athlete_id);
    return { content: [{ type: "text", text: "Event deleted successfully" }] };
  }
);

server.tool(
  "get_workouts",
  "List workouts from the workout library",
  {
    athlete_id: athleteIdParam,
  },
  async ({ athlete_id }) => {
    const data = await client.getWorkouts(athlete_id);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_workout",
  "Create a workout in the workout library. Use 'description' with Intervals.icu text syntax (same format as create_event).",
  {
    name: z.string().describe("Workout name"),
    type: z.string().describe("Sport type: Ride, Run, Swim, etc."),
    description: z
      .string()
      .describe("Workout in Intervals.icu text syntax (see create_event for full syntax reference)"),
    athlete_id: athleteIdParam,
  },
  async ({ name, type, description, athlete_id }) => {
    const data = await client.createWorkout({ name, type, description }, athlete_id);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_sport_settings",
  "Get sport settings including FTP, LTHR, zones for all configured sports",
  {
    athlete_id: athleteIdParam,
  },
  async ({ athlete_id }) => {
    const data = await client.getSportSettings(athlete_id);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_gear",
  "List all gear (bikes, shoes, etc.)",
  {
    athlete_id: athleteIdParam,
  },
  async ({ athlete_id }) => {
    const data = await client.getGear(athlete_id);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_power_curves",
  "Get best power/pace curve data for a date range",
  {
    oldest: z.string().describe("Start date (yyyy-MM-dd)").optional(),
    newest: z.string().describe("End date (yyyy-MM-dd)").optional(),
    athlete_id: athleteIdParam,
  },
  async ({ oldest, newest, athlete_id }) => {
    const data = await client.getActivityPaceCurves(oldest, newest, athlete_id);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// --- Prompts ---

server.prompt(
  "analyze_training",
  "Analyze an athlete's recent training and provide insights on load, volume, intensity distribution, and recovery.",
  {
    athlete_name: z.string().describe("Name of the athlete (use list_athletes to find them)").optional(),
    weeks: z.string().describe("Number of weeks to analyze (default: 4)").optional(),
  },
  async ({ athlete_name, weeks }) => {
    const numWeeks = weeks || "4";
    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Analyseer de trainingen van ${athlete_name || "mij"} over de afgelopen ${numWeeks} weken. Volg dit stappenplan:

## Stap 1: Data ophalen
${athlete_name ? `- Gebruik list_athletes om het athlete ID te vinden van "${athlete_name}"` : "- Gebruik je eigen athlete ID"}
- Haal het athlete profiel op (get_athlete) voor FTP, zones, gewicht
- Haal sport_settings op voor trainingszone-configuratie
- Haal alle activiteiten op van de afgelopen ${numWeeks} weken (get_activities)
- Haal wellness data op voor dezelfde periode (get_wellness)

## Stap 2: Analyse
Maak een overzicht van:

### Volume & Frequentie
- Aantal trainingen per week, per sport
- Totale duur per week (uren)
- Totale afstand per week (km)
- Trend: stijgend / dalend / stabiel

### Intensiteitsverdeling
- Verdeling over zones (als er power/HR data is)
- Verhouding easy / moderate / hard sessies
- Vergelijk met 80/20 of polarized model

### Belasting & Herstel
- Training Load (TSS/CTL/ATL) trend
- Fitness (CTL) trend
- Vorm (TSB) - is de atleet fris of vermoeid?
- Ramp rate - niet hoger dan 5-7 CTL/week

### Wellness
- Slaap, HRV, rust-HR trends
- Subjectieve scores (vermoeidheid, spierpijn, stemming)
- Correlatie tussen training load en wellness

## Stap 3: Conclusies
- Wat gaat goed?
- Wat zijn aandachtspunten?
- Is er risico op overtraining?
- Concrete aanbevelingen

Presenteer alles in een duidelijk, overzichtelijk format met tabellen waar nuttig.`,
          },
        },
      ],
    };
  }
);

server.prompt(
  "plan_training",
  "Create a training plan for the coming weeks based on recent training analysis.",
  {
    athlete_name: z.string().describe("Name of the athlete").optional(),
    weeks: z.string().describe("Number of weeks to plan (default: 4)").optional(),
    instructions: z.string().describe("Specific instructions for the plan (e.g. 'no intervals', 'Tuesday short, Friday long')").optional(),
  },
  async ({ athlete_name, weeks, instructions }) => {
    const numWeeks = weeks || "4";
    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Maak een trainingsplan voor ${athlete_name || "mij"} voor de komende ${numWeeks} weken.
${instructions ? `\nSpecifieke instructies: ${instructions}` : ""}

## Stap 1: Huidige situatie analyseren
${athlete_name ? `- Gebruik list_athletes om het athlete ID te vinden van "${athlete_name}"` : "- Gebruik je eigen athlete ID"}
- Haal het athlete profiel op (get_athlete) voor FTP, LTHR, zones
- Haal sport_settings op
- Haal activiteiten op van de afgelopen 4-6 weken (get_activities) om het huidige trainingspatroon te begrijpen
- Haal geplande events op voor de komende weken (get_events) om te zien wat er al staat
- Haal wellness data op (get_wellness) voor actuele fitheid

## Stap 2: Trainingspatroon analyseren
Bepaal uit de recente data:
- Gemiddeld aantal sessies per week
- Welke dagen wordt er getraind
- Gemiddelde duur per sessie en per dag
- Verdeling per sport (fietsen, hardlopen, zwemmen, kracht, etc.)
- Huidige training load (CTL) en trend

## Stap 3: Plan opstellen
Houd rekening met deze principes:
- **Continuïteit**: houd het trainingsvolume en frequentie vergelijkbaar met recent, tenzij anders gevraagd
- **Progressieve overbelasting**: bouw geleidelijk op (max 5-10% per week)
- **Herstel**: plan elke 3-4 weken een rustweek (70-75% van normaal volume)
- **Intensiteitsverdeling**: ~80% easy / ~20% moderate+hard, tenzij anders gevraagd
- **Specificiteit**: pas de training aan op het sporttype en de doelen van de atleet
- **Afwisseling**: wissel zware en lichte dagen af

## Stap 4: Presenteer het plan
Geef per week een overzicht in tabel-format:
| Dag | Type | Duur | Beschrijving | Intensiteit |
Inclusief:
- Weekvolume totaal
- Geplande Training Load per week
- Korte toelichting per sessie

## Stap 5: Bevestig en plan in
Vraag eerst bevestiging voordat je de workouts daadwerkelijk aanmaakt.
Gebruik dan create_event met category WORKOUT om elke sessie in te plannen op de kalender van de atleet.
Gebruik het Intervals.icu workout tekstformat in het description veld. De API parsed dit automatisch.

### Workout tekstformat referentie:
Elke stap begint met "-". Format: -duur intensiteit [opties]

Duur: 10m, 15', 30s, 90", 1h30m, 400mtr, 1km, 1000mtr (LET OP: "m" = minuten, gebruik "mtr" of "km" voor afstand)
Pace: Z1 pace, Z2 pace, 75-85% pace, 92-97% pace
HR: Z1 HR, Z2 HR, Z3 HR, 80% LTHR
Power: Z2, Z3, 75%, 88-93%, 200w
Lap button: "press lap" aan het eind - ALLEEN bij stevige intervallen (bijv. 8x600, 5x1000) op de warmup en cooldown stap. NIET bij duurlopen, tempo blokken, of marathontempo blokken.

HERHALINGEN: Er MOET een witregel VOOR de Nx regel staan. Alle stappen met "-" eronder horen bij de herhaling. Een witregel na de laatste stap beëindigt het blok.

TOTALE DUUR MOET KLOPPEN: Als een workout een totale duur heeft (bijv. "DL 50' Z1 met 5x2' Z2"), moeten alle stappen optellen tot dat totaal.
Controleer altijd: warmup + (herhalingen × (werk + rust)) + cooldown = totale duur.

BLOKKEN IN HET MIDDEN: De zware blokken moeten gecentreerd zitten in de workout. Meer warmup dan cooldown (~2/3 warmup, ~1/3 cooldown van de resterende tijd).

Voorbeeld easy run:
-60' 75-85% pace

Voorbeeld DL 50' Z1 met 5x2' Z2 (blokken gecentreerd):
-17' Z1 pace

5x
-2' Z2 pace
-3' Z1 pace

-8' Z1 pace

Voorbeeld easy ride:
-90' 65-75%`,
          },
        },
      ],
    };
  }
);

server.prompt(
  "weekly_report",
  "Generate a weekly training report comparing planned vs actual training.",
  {
    athlete_name: z.string().describe("Name of the athlete").optional(),
    date: z.string().describe("Any date in the target week (yyyy-MM-dd). Defaults to current week.").optional(),
  },
  async ({ athlete_name, date }) => {
    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Maak een weekrapport voor ${athlete_name || "mij"}${date ? ` voor de week van ${date}` : " voor deze week"}.

## Stap 1: Data ophalen
${athlete_name ? `- Gebruik list_athletes om het athlete ID te vinden van "${athlete_name}"` : "- Gebruik je eigen athlete ID"}
- Bepaal de maandag en zondag van de betreffende week
- Haal activiteiten op voor die week (get_activities)
- Haal geplande events op voor die week (get_events) - dit zijn de geplande workouts
- Haal wellness data op voor die week (get_wellness)
- Haal sport settings op voor zones/FTP context

## Stap 2: Gepland vs. Uitgevoerd
Maak een vergelijking per dag:
| Dag | Gepland | Uitgevoerd | Duur gepland | Duur werkelijk | Load gepland | Load werkelijk |

## Stap 3: Samenvatting
- Totaal volume (uren) gepland vs werkelijk
- Totaal training load gepland vs werkelijk
- Naleving percentage
- Welke sessies gemist of aangepast?
- Welke sessies extra gedaan?

## Stap 4: Wellness overzicht
- Slaap trend door de week
- HRV / rust-HR trend
- Subjectieve scores (vermoeidheid, spierpijn)
- Opvallende patronen (bijv. slechte slaap na zware training)

## Stap 5: Conclusie
- Hoe is de week verlopen?
- Aandachtspunten voor volgende week
- Eventuele suggesties voor bijsturing van het plan`,
          },
        },
      ],
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
