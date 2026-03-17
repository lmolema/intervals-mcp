const BASE_URL = "https://intervals.icu/api/v1";

export class IntervalsClient {
  private apiKey: string;
  private defaultAthleteId: string;

  constructor(apiKey: string, athleteId: string) {
    this.apiKey = apiKey;
    this.defaultAthleteId = athleteId;
  }

  private aid(athleteId?: string): string {
    return athleteId || this.defaultAthleteId;
  }

  private get authHeader(): string {
    return "Basic " + Buffer.from(`API_KEY:${this.apiKey}`).toString("base64");
  }

  async request(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string>
  ): Promise<unknown> {
    const url = new URL(`${BASE_URL}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      }
    }

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: "application/json",
    };
    if (body) headers["Content-Type"] = "application/json";

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Intervals.icu API error ${res.status}: ${text}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return res.json();
    }
    return res.text();
  }

  // Coached athletes
  async getAthletes() {
    return this.request("GET", `/athletes`);
  }

  // Athlete
  async getAthlete(athleteId?: string) {
    return this.request("GET", `/athlete/${this.aid(athleteId)}`);
  }

  // Activities
  async getActivities(oldest?: string, newest?: string, athleteId?: string) {
    const query: Record<string, string> = {};
    if (oldest) query.oldest = oldest;
    if (newest) query.newest = newest;
    return this.request("GET", `/athlete/${this.aid(athleteId)}/activities`, undefined, query);
  }

  async getActivity(activityId: string) {
    return this.request("GET", `/activity/${activityId}`);
  }

  async getActivityStreams(activityId: string, types?: string[]) {
    const query: Record<string, string> = {};
    if (types?.length) query.types = types.join(",");
    return this.request("GET", `/activity/${activityId}/streams.json`, undefined, query);
  }

  async getActivityIntervals(activityId: string) {
    return this.request("GET", `/activity/${activityId}/intervals`);
  }

  // Wellness
  async getWellness(oldest?: string, newest?: string, athleteId?: string) {
    const query: Record<string, string> = {};
    if (oldest) query.oldest = oldest;
    if (newest) query.newest = newest;
    return this.request("GET", `/athlete/${this.aid(athleteId)}/wellness`, undefined, query);
  }

  async getWellnessDay(date: string, athleteId?: string) {
    return this.request("GET", `/athlete/${this.aid(athleteId)}/wellness/${date}`);
  }

  async updateWellness(date: string, data: Record<string, unknown>, athleteId?: string) {
    return this.request("PUT", `/athlete/${this.aid(athleteId)}/wellness/${date}`, data);
  }

  // Events / Calendar
  async getEvents(oldest?: string, newest?: string, athleteId?: string) {
    const query: Record<string, string> = {};
    if (oldest) query.oldest = oldest;
    if (newest) query.newest = newest;
    return this.request("GET", `/athlete/${this.aid(athleteId)}/events`, undefined, query);
  }

  async createEvent(event: Record<string, unknown>, athleteId?: string) {
    return this.request("POST", `/athlete/${this.aid(athleteId)}/events`, event);
  }

  async updateEvent(eventId: string, event: Record<string, unknown>, athleteId?: string) {
    return this.request("PUT", `/athlete/${this.aid(athleteId)}/events/${eventId}`, event);
  }

  async deleteEvent(eventId: string, athleteId?: string) {
    return this.request("DELETE", `/athlete/${this.aid(athleteId)}/events/${eventId}`);
  }

  // Workouts library
  async getWorkouts(athleteId?: string) {
    return this.request("GET", `/athlete/${this.aid(athleteId)}/workouts`);
  }

  async createWorkout(workout: Record<string, unknown>, athleteId?: string) {
    return this.request("POST", `/athlete/${this.aid(athleteId)}/workouts`, workout);
  }

  // Sport settings (FTP, zones, etc.)
  async getSportSettings(athleteId?: string) {
    return this.request("GET", `/athlete/${this.aid(athleteId)}/sport-settings`);
  }

  // Gear
  async getGear(athleteId?: string) {
    return this.request("GET", `/athlete/${this.aid(athleteId)}/gear`);
  }

  // Power/pace curves
  async getActivityPaceCurves(oldest?: string, newest?: string, athleteId?: string) {
    const query: Record<string, string> = {};
    if (oldest) query.oldest = oldest;
    if (newest) query.newest = newest;
    return this.request(
      "GET",
      `/athlete/${this.aid(athleteId)}/activity-pace-curves.json`,
      undefined,
      query
    );
  }
}
