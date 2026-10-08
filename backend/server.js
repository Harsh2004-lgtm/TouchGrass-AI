const express = require("express");
const cors = require("cors");
const axios = require("axios");
const db = require("./database");

const app = express();

// --------------------------------------------------
// Middleware
// --------------------------------------------------

const frontendUrl = process.env.FRONTEND_URL;

app.use(
  cors(
    frontendUrl
      ? {
          origin: frontendUrl,
        }
      : {}
  )
);

app.use(express.json());

// --------------------------------------------------
// Health
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TouchGrass AI backend is running! 🌿",
  });
});

// Check AI configuration
app.get("/api/health/ai", (req, res) => {
  res.json({
    success: true,
    hfConfigured: Boolean(process.env.HF_TOKEN),
    model:
      process.env.HF_MODEL ||
      "google/gemma-2-2b-it",
  });
});

// --------------------------------------------------
// Generate AI Mission
// --------------------------------------------------

app.post("/api/mission", async (req, res) => {
  const { time, activity } = req.body;

  if (!time || !activity) {
    return res.status(400).json({
      success: false,
      message: "Time aur activity required hai.",
    });
  }

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
- Return only the mission.
`;

  try {
    let missionText = "";

    // ----------------------------------------------
    // Production: Hugging Face
    // ----------------------------------------------

    if (process.env.HF_TOKEN) {
      const model =
        process.env.HF_MODEL ||
        "google/gemma-2-2b-it";

      const response = await axios.post(
        "https://router.huggingface.co/v1/chat/completions",
        {
          model: model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 300,
          temperature: 0.7,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      missionText =
        response.data?.choices?.[0]?.message?.content?.trim() ||
        "";
    }

    // ----------------------------------------------
    // Local development: Ollama fallback
    // ----------------------------------------------

    else {
      const response = await axios.post(
        "http://localhost:11434/api/generate",
        {
          model: "gemma:2b",
          prompt: prompt,
          stream: false,
        },
        {
          timeout: 60000,
        }
      );

      missionText =
        response.data?.response?.trim() || "";
    }

    if (!missionText) {
      throw new Error("AI returned an empty mission.");
    }

    // ----------------------------------------------
    // Save mission to SQLite
    // ----------------------------------------------

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
      .run(
        activity,
        time,
        missionText,
        "generated"
      );

    return res.json({
      success: true,
      missionId: result.lastInsertRowid,
      mission: missionText,
    });
  } catch (error) {
    console.error("AI/Database Error:", {
      status: error.response?.status || null,
      data: error.response?.data || null,
      message: error.message,
    });

    if (error.response) {
      return res.status(502).json({
        success: false,
        message:
          "Hugging Face AI service se response nahi aa raha.",
        providerStatus: error.response.status,
        providerError:
          error.response.data?.error?.message ||
          error.response.data?.error ||
          error.response.data?.message ||
          "Unknown provider error",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "AI ya database se response nahi aa raha.",
    });
  }
});

// --------------------------------------------------
// Mark mission as completed
// --------------------------------------------------

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

    return res.json({
      success: true,
      message: "Mission completed! 🎉",
    });
  } catch (error) {
    console.error(
      "Complete Mission Error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Mission update nahi ho paayi.",
    });
  }
});

// --------------------------------------------------
// Mission History
// --------------------------------------------------

app.get("/api/missions", (req, res) => {
  try {
    const missions = db
      .prepare(`
        SELECT *
        FROM missions
        ORDER BY id DESC
      `)
      .all();

    return res.json({
      success: true,
      missions,
    });
  } catch (error) {
    console.error(
      "Mission History Error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Mission history nahi mil paayi.",
    });
  }
});

// --------------------------------------------------
// Progress
// --------------------------------------------------

app.get("/api/progress", (req, res) => {
  try {
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

    const completedDays = db
      .prepare(`
        SELECT DISTINCT
          date(
            completed_at,
            '+05:30'
          ) AS completion_date
        FROM missions
        WHERE status = 'completed'
          AND completed_at IS NOT NULL
        ORDER BY completion_date DESC
      `)
      .all();

    let currentStreak = 0;

    if (completedDays.length > 0) {
      const todayString =
        new Intl.DateTimeFormat(
          "en-CA",
          {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }
        ).format(new Date());

      const latestDate =
        completedDays[0].completion_date;

      if (latestDate === todayString) {
        currentStreak = 1;

        for (
          let i = 1;
          i < completedDays.length;
          i++
        ) {
          const previous = new Date(
            `${completedDays[i - 1].completion_date}T00:00:00Z`
          );

          const current = new Date(
            `${completedDays[i].completion_date}T00:00:00Z`
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

    const totalMissions =
      Number(stats.total_missions) || 0;

    const completedMissions =
      Number(stats.completed_missions) || 0;

    const totalOutdoorMinutes =
      Number(
        stats.total_outdoor_minutes
      ) || 0;

    const completionRate =
      totalMissions > 0
        ? Math.round(
            (completedMissions /
              totalMissions) *
              100
          )
        : 0;

    return res.json({
      success: true,

      progress: {
        totalMissions,
        completedMissions,
        totalOutdoorMinutes,
        completionRate,
        currentStreak,
      },
    });
  } catch (error) {
    console.error(
      "Progress Error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Progress data nahi mil paaya.",
    });
  }
});

// --------------------------------------------------
// Server
// --------------------------------------------------

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(
    `Server running on ${HOST}:${PORT}`
  );
});