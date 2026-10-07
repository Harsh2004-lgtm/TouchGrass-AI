import { useState, useEffect } from "react";



import "./App.css";







function App() {



  const [time, setTime] = useState(30);



  const [activity, setActivity] = useState("Walking");







  const [mission, setMission] = useState("");



  const [missionId, setMissionId] = useState(null);







  const [loading, setLoading] = useState(false);



  const [missionStarted, setMissionStarted] = useState(false);



  const [secondsLeft, setSecondsLeft] = useState(0);



  const [missionCompleted, setMissionCompleted] = useState(false);







  // Mission history



  const [history, setHistory] = useState([]);







  // User progress



  const [progress, setProgress] = useState(null);



  // Streak message

  const getStreakMessage = (streak) => {

    if (streak >= 30) return "TouchGrass Legend! 🌿";

    if (streak >= 7) return "One week strong! 💪";

    if (streak >= 3) return "You're on fire! 🔥";

    if (streak >= 1) return "Keep going! 🌱";

    return "Start your streak!";

  };

  // Achievement badges
  const getAchievements = () => {
    if (!progress) return [];

    return [
      {
        icon: "🏅",
        title: "First Touch",
        description: "Complete your first mission",
        unlocked: progress.completedMissions >= 1,
      },
      {
        icon: "🔥",
        title: "3 Day Streak",
        description: "Maintain a 3 day streak",
        unlocked: progress.currentStreak >= 3,
      },
      {
        icon: "💪",
        title: "7 Day Streak",
        description: "Maintain a 7 day streak",
        unlocked: progress.currentStreak >= 7,
      },
      {
        icon: "🌳",
        title: "100 Outdoor Minutes",
        description: "Spend 100 minutes outdoors",
        unlocked: progress.totalOutdoorMinutes >= 100,
      },
      {
        icon: "🏆",
        title: "Mission Master",
        description: "Complete 10 missions",
        unlocked: progress.completedMissions >= 10,
      },
    ];
  };







  // Load mission history



  const loadHistory = async () => {



    try {



      const response = await fetch(



        "http://localhost:5000/api/missions"



      );







      const data = await response.json();







      if (data.success) {



        setHistory(data.missions);



      }



    } catch (error) {



      console.error("History fetch error:", error);



    }



  };







  // Load user progress



  const loadProgress = async () => {



    try {



      const response = await fetch(



        "http://localhost:5000/api/progress"



      );







      const data = await response.json();







      if (data.success) {



        setProgress(data.progress);



      }



    } catch (error) {



      console.error("Progress fetch error:", error);



    }



  };







  // Load history and progress when app starts



  useEffect(() => {



    loadHistory();



    loadProgress();



  }, []);







  // Countdown timer



  useEffect(() => {



    if (!missionStarted || secondsLeft <= 0) return;







    const timer = setInterval(() => {



      setSecondsLeft((prev) => prev - 1);



    }, 1000);







    return () => clearInterval(timer);



  }, [missionStarted, secondsLeft]);







  // Mark mission completed in SQLite



  useEffect(() => {



    if (



      !missionStarted ||



      secondsLeft !== 0 ||



      !missionId ||



      missionCompleted



    ) {



      return;



    }







    const completeMission = async () => {



      try {



        const response = await fetch(



          `http://localhost:5000/api/mission/${missionId}/complete`,



          {



            method: "PATCH",



          }



        );







        const data = await response.json();







        if (data.success) {



          console.log("Mission saved as completed! 🎉");







          setMissionCompleted(true);







          // Refresh history and progress



          loadHistory();



          loadProgress();



        } else {



          console.error(



            "Mission completion failed:",



            data.message



          );



        }



      } catch (error) {



        console.error("Complete mission error:", error);



      }



    };







    completeMission();



  }, [



    missionStarted,



    secondsLeft,



    missionId,



    missionCompleted,



  ]);







  // Format seconds as MM:SS



  const formatTime = (seconds) => {



    const minutes = Math.floor(seconds / 60);



    const remainingSeconds = seconds % 60;







    return `${String(minutes).padStart(2, "0")}:${String(



      remainingSeconds



    ).padStart(2, "0")}`;



  };







  // Generate AI mission



  const generateMission = async () => {



    setLoading(true);



    setMission("");



    setMissionId(null);



    setMissionStarted(false);



    setSecondsLeft(0);



    setMissionCompleted(false);







    try {



      const response = await fetch(



        "http://localhost:5000/api/mission",



        {



          method: "POST",



          headers: {



            "Content-Type": "application/json",



          },



          body: JSON.stringify({



            time,



            activity,



          }),



        }



      );







      const data = await response.json();







      if (!data.success) {



        setMission("Mission generate nahi ho paayi. 😕");



        return;



      }







      setMission(data.mission);



      setMissionId(data.missionId);







      // Refresh history and progress



      loadHistory();



      loadProgress();



    } catch (error) {



      console.error(error);







      setMission(



        "Backend se connection nahi ho pa raha. 😕"



      );



    } finally {



      setLoading(false);



    }



  };







  // Start mission



  const startMission = () => {



    setMissionStarted(true);



    setMissionCompleted(false);



    setSecondsLeft(time * 60);



  };







  // Activity icon



  const getActivityIcon = (activity) => {



    if (activity === "Walking") return "🚶";



    if (activity === "Nature") return "🌳";



    if (activity === "Photography") return "📸";



    if (activity === "Exercise") return "🏃";







    return "🌿";



  };







  return (



    <div className="app">



      <nav className="navbar">



        <div className="logo">🌿 TouchGrass AI</div>







        <span className="tagline">



          AI that gets you outside



        </span>



      </nav>







      <main className="hero">



        <div className="hero-content">



          <div className="badge">



            🤖 Powered by Open-Source AI



          </div>







          <h1>



            Get off your screen.



            <br />



            <span>Go touch some grass.</span>



          </h1>







          <p>



            Tell us how much time you have and what you enjoy.



            <br />



            AI will create a real-world mission for you.



          </p>







          {/* Mission Generator */}



          <section className="card">



            <h2>⏱️ How much time do you have?</h2>







            <div className="options">



              {[15, 30, 60].map((minutes) => (



                <button



                  key={minutes}



                  className={



                    time === minutes



                      ? "option active"



                      : "option"



                  }



                  onClick={() => setTime(minutes)}



                >



                  {minutes} min



                </button>



              ))}



            </div>







            <h2>🌳 What do you want to do?</h2>







            <div className="options">



              {[



                "Walking",



                "Nature",



                "Photography",



                "Exercise",



              ].map((item) => (



                <button



                  key={item}



                  className={



                    activity === item



                      ? "option active"



                      : "option"



                  }



                  onClick={() => setActivity(item)}



                >



                  {item}



                </button>



              ))}



            </div>







            <button



              className="generate"



              onClick={generateMission}



            >



              {loading



                ? "⏳ Creating..."



                : "🚀 Generate My Mission"}



            </button>







            {/* AI Mission Card */}



            {mission && !missionStarted && (



              <div className="mission-card">



                <div className="mission-header">



                  <span className="mission-icon">



                    🌿



                  </span>







                  <div>



                    <h2>Your AI Mission</h2>







                    <p>



                      {time} minutes • {activity}



                    </p>



                  </div>



                </div>







                <div className="mission-content">



                  {mission}



                </div>







                <div className="phone-warning">



                  📵 Put your phone away and enjoy the



                  outside.



                </div>







                <button



                  className="start-mission"



                  onClick={startMission}



                >



                  🚀 Start Mission



                </button>



              </div>



            )}







            {/* Mission Timer */}



            {missionStarted && (



              <div className="mission-started">



                {!missionCompleted ? (



                  <>



                    <div className="big-leaf">



                      🌿



                    </div>







                    <h2>Mission in Progress</h2>







                    <p>



                      Your {time}-minute{" "}



                      {activity.toLowerCase()} mission is



                      running.



                    </p>







                    <div className="timer">



                      {formatTime(secondsLeft)}



                    </div>







                    <div className="screen-break">



                      📵



                      <strong>



                        {" "}



                        Put your phone away.



                      </strong>



                      <br />



                      Go outside and enjoy the real world.



                    </div>







                    <p className="come-back">



                      Come back when you complete your



                      mission.



                    </p>



                  </>



                ) : (



                  <>



                    <div className="big-leaf">



                      🎉



                    </div>







                    <h2>Mission Complete!</h2>







                    <p>



                      You spent {time} minutes working on



                      your outdoor mission.



                    </p>







                    <div className="screen-break">



                      🌿{" "}



                      <strong>Great job!</strong>



                      <br />



                      You chose the real world over the



                      screen.



                    </div>







                    <p className="come-back">



                      Time to celebrate your outdoor



                      adventure! 🌱



                    </p>



                  </>



                )}



              </div>



            )}



          </section>







          {/* Progress Dashboard */}



          {progress && (



            <section className="progress-section">



              <h2>📊 Your Progress</h2>







              <div className="progress-grid">



                <div className="progress-card">



                  <div className="progress-icon">



                    🌱



                  </div>







                  <h3>{progress.totalMissions}</h3>







                  <p>Total Missions</p>



                </div>







                <div className="progress-card">



                  <div className="progress-icon">



                    ✅



                  </div>







                  <h3>



                    {progress.completedMissions}



                  </h3>







                  <p>Completed</p>



                </div>







                <div className="progress-card">



                  <div className="progress-icon">



                    ⏱️



                  </div>







                  <h3>



                    {progress.totalOutdoorMinutes}



                  </h3>







                  <p>Outdoor Minutes</p>



                </div>







                <div className="progress-card">



                  <div className="progress-icon">



                    📈



                  </div>







                  <h3>



                    {progress.completionRate}%



                  </h3>







                  <p>Completion Rate</p>



                </div>







                {/* Day Streak */}



                <div className="progress-card streak-card">

                  <div className="progress-icon">

                    🔥

                  </div>



                  <h3>

                    {progress.currentStreak}

                  </h3>



                  <p>

                    {progress.currentStreak === 1

                      ? "Day Streak"

                      : "Days Streak"}

                  </p>



                  <span className="streak-message">

                    {getStreakMessage(progress.currentStreak)}

                  </span>

                </div>



              </div>



            </section>



          )}







          {/* Achievements */}
          {progress && (
            <section className="progress-section achievements-section">
              <h2>🏆 Achievements</h2>

              <div
                className="progress-grid"
                style={{
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(160px, 1fr))",
                }}
              >
                {getAchievements().map((badge) => (
                  <div
                    className="progress-card"
                    key={badge.title}
                    style={{
                      opacity: badge.unlocked ? 1 : 0.45,
                      filter: badge.unlocked ? "none" : "grayscale(1)",
                    }}
                  >
                    <div className="progress-icon">
                      {badge.icon}
                    </div>

                    <h3
                      style={{
                        fontSize: "18px",
                        marginBottom: "6px",
                      }}
                    >
                      {badge.title}
                    </h3>

                    <p>{badge.description}</p>

                    <span
                      style={{
                        display: "block",
                        marginTop: "8px",
                        fontSize: "11px",
                        fontWeight: "600",
                        color: badge.unlocked ? "#24733a" : "#6b7280",
                      }}
                    >
                      {badge.unlocked ? "✅ Unlocked" : "🔒 Locked"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Mission History */}



          {history.length > 0 && (



            <section className="history-section">



              <h2>📜 Mission History</h2>







              <div className="history-list">



                {history.map((item) => (



                  <div



                    className="history-item"



                    key={item.id}



                  >



                    <div className="history-icon">



                      {getActivityIcon(item.activity)}



                    </div>







                    <div className="history-info">



                      <h3>{item.activity}</h3>







                      <p>



                        {item.planned_time} minutes



                      </p>



                    </div>







                    <div



                      className={



                        item.status === "completed"



                          ? "history-status completed"



                          : "history-status"



                      }



                    >



                      {item.status === "completed"



                        ? "✅ Completed"



                        : "🟡 Generated"}



                    </div>



                  </div>



                ))}



              </div>



            </section>



          )}



        </div>



      </main>







      <footer>



        🌱 Less screen time. More real life.



      </footer>



    </div>



  );



}
export default App;