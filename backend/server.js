const express = require("express");
const cors = require("cors");
const axios = require("axios");
const db = require("./database");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "TouchGrass AI backend is running! 🌿",
  });
});

// Generate AI Mission
app.post("/api/mission", async (req, res) => {
  const { time, activity } = req.body;

  try {
    const prompt = `
You are TouchGrass AI, an outdoor activity planner.

Create a safe and fun outdoor mission for a person.

Available time: ${time} minutes
Preferred activity: ${activity}

Rules:
- The user must physically go outside.
- Create 3 to 5 simple steps.
- Keep the mission realistic for the available time.
- Encourage less phone usage.
- Do not suggest dangerous activities.
- Keep the response short and motivating.

Return only the mission, no extra explanation.
`;

    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "gemma:2b",
        prompt: prompt,
        stream: false,
      }
    );

    const missionText = response.data.response;

    // Save mission in SQLite
    const result = db
      .prepare(`
        INSERT INTO missions (
          activity,
          planned_time,
          mission_text,
          status
        )
        VALUES (?, ?, ?, ?)
      `)
      .run(activity, time, missionText, "generated");

    res.json({
      success: true,
      missionId: result.lastInsertRowid,
      mission: missionText,
    });
  } catch (error) {
    console.error(
      "Ollama/Database Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "AI ya database se response nahi aa raha.",
    });
  }
});

// Mark mission as completed
app.patch("/api/mission/:id/complete", (req, res) => {
  try {
    const missionId = req.params.id;

    const result = db
      .prepare(`
        UPDATE missions
        SET status = 'completed',
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .run(missionId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Mission nahi mili.",
      });
    }

    res.json({
      success: true,
      message: "Mission completed! 🎉",
    });
  } catch (error) {
    console.error(
      "Complete Mission Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Mission update nahi ho paayi.",
    });
  }
});

// Get mission history
app.get("/api/missions", (req, res) => {
  try {
    const missions = db
      .prepare(`
        SELECT *
        FROM missions
        ORDER BY id DESC
      `)
      .all();

    res.json({
      success: true,
      missions,
    });
  } catch (error) {
    console.error(
      "Mission History Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Mission history nahi mil paayi.",
    });
  }
});

// Get user progress
app.get("/api/progress", (req, res) => {
  try {
    // Basic progress stats
    const stats = db
      .prepare(`
        SELECT
          COUNT(*) AS total_missions,

          SUM(
            CASE
              WHEN status = 'completed'
              THEN 1
              ELSE 0
            END
          ) AS completed_missions,

          COALESCE(
            SUM(
              CASE
                WHEN status = 'completed'
                THEN planned_time
                ELSE 0
              END
            ),
            0
          ) AS total_outdoor_minutes

        FROM missions
      `)
      .get();

    // Get unique days on which at least
    // one mission was completed
    const completedDays = db
      .prepare(`
        SELECT DISTINCT
          date(completed_at, '+05:30') AS completion_date
        FROM missions
        WHERE status = 'completed'
          AND completed_at IS NOT NULL
        ORDER BY completion_date DESC
      `)
      .all();

    // Calculate current streak
    let currentStreak = 0;

    if (completedDays.length > 0) {
      const today = new Date();

      const todayString =
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0");

      const latestDate =
        completedDays[0].completion_date;

      // Streak is active only when
      // today's mission has been completed
      if (latestDate === todayString) {
        currentStreak = 1;

        for (
          let i = 1;
          i < completedDays.length;
          i++
        ) {
          const previous = new Date(
            completedDays[i - 1].completion_date
          );

          const current = new Date(
            completedDays[i].completion_date
          );

          const difference =
            (previous - current) /
            (1000 * 60 * 60 * 24);

          if (difference === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Completion percentage
    const completionRate =
      stats.total_missions > 0
        ? Math.round(
            (stats.completed_missions /
              stats.total_missions) *
              100
          )
        : 0;

    res.json({
      success: true,

      progress: {
        totalMissions: stats.total_missions,
        completedMissions:
          stats.completed_missions,
        totalOutdoorMinutes:
          stats.total_outdoor_minutes,
        completionRate,
        currentStreak,
      },
    });
  } catch (error) {
    console.error(
      "Progress Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Progress data nahi mil paaya.",
    });
  }
});

// Server
const PORT = 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});