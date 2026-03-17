# Intervals.icu MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects Claude to the [Intervals.icu](https://intervals.icu) training platform. Query your training data, create workouts, manage your calendar, and coach athletes — all through natural language in Claude Desktop.

## Features

### Tools (18)

| Tool | Description |
|------|-------------|
| `list_athletes` | List all athletes you coach |
| `get_athlete` | Get athlete profile (weight, FTP, zones) |
| `get_activities` | List activities in a date range |
| `get_activity` | Get detailed info for a single activity |
| `get_activity_streams` | Get time-series data (power, HR, cadence, etc.) |
| `get_activity_intervals` | Get intervals/laps for an activity |
| `get_wellness` | Get wellness data (weight, HRV, sleep, mood) for a date range |
| `get_wellness_day` | Get wellness data for a specific day |
| `update_wellness` | Update wellness data for a day |
| `get_events` | Get calendar events (planned workouts, notes, targets) |
| `create_event` | Create a workout, note, target, or race on the calendar |
| `update_event` | Update an existing calendar event |
| `delete_event` | Delete a calendar event |
| `get_workouts` | List workouts from the workout library |
| `create_workout` | Create a workout in the library |
| `get_sport_settings` | Get FTP, LTHR, zones for all sports |
| `get_gear` | List all gear (bikes, shoes, etc.) |
| `get_power_curves` | Get best power/pace curves for a date range |

All tools that operate on athlete data accept an optional `athlete_id` parameter, so coaches can query and manage data for any of their athletes.

### Prompt Templates (3)

Available via the attachment icon (📎) in Claude Desktop:

- **analyze_training** — Full training analysis: volume, intensity distribution, load/recovery trends, wellness, overtraining risk
- **plan_training** — Create a periodized training plan based on recent data, with customizable instructions
- **weekly_report** — Weekly report comparing planned vs. actual training with wellness trends

## Setup

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- An [Intervals.icu](https://intervals.icu) account
- [Claude Desktop](https://claude.ai/download)

### 1. Get your Intervals.icu credentials

1. Go to [Intervals.icu](https://intervals.icu) → Settings → Developer Settings
2. Copy your **API Key**
3. Copy your **Athlete ID** (e.g. `i12345`)

### 2. Install and build

```bash
git clone https://github.com/lmolema/intervals-mcp.git
cd intervals-mcp
npm install
npm run build
```

### 3. Configure Claude Desktop

Add the following to your Claude Desktop config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "intervals-icu": {
      "command": "node",
      "args": ["/absolute/path/to/intervals-mcp/dist/index.js"],
      "env": {
        "INTERVALS_API_KEY": "your_api_key_here",
        "INTERVALS_ATHLETE_ID": "your_athlete_id_here"
      }
    }
  }
}
```

Replace the path and credentials with your own values.

### 4. Restart Claude Desktop

The Intervals.icu tools should now appear in Claude Desktop.

## Usage Examples

Just ask Claude in natural language:

- "What were my activities last week?"
- "How is my fitness trend this month?"
- "Show my athletes"
- "Analyze my athlete's training over the past 4 weeks"
- "Create a 60-minute easy run for Tuesday"
- "Plan 4 weeks of training for my athlete, Tuesday short, Friday long, no intervals"

### Workout Syntax

When creating workouts, the server uses the Intervals.icu workout text format. Claude knows this syntax and will generate it correctly. Some examples:

```
Easy run:
-60' 75-85% pace

DL with zone blocks:
-15' Z1 pace
-15' Z2 pace
-15' Z3 pace
-15' Z1 pace

Interval session (8x600mtr):
-15' wu Z1 pace press lap

8x
-600mtr 94-98% pace
-90" rest Z1 pace

-15' cd Z1 pace press lap
```

## Coaching

If you coach athletes on Intervals.icu, all tools work with their data too. Use `list_athletes` to find their IDs, then pass `athlete_id` to any tool — or just refer to them by name and Claude will figure it out.

## License

MIT
