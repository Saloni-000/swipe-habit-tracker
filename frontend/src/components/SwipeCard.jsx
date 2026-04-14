import React, { useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

const SwipeCard = ({ habit, onSwipe }) => {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);

  const feedbackLeftOpacity = useTransform(x, [-200, -80, 0], [1, 0.5, 0]);
  const feedbackRightOpacity = useTransform(x, [0, 80, 200], [0, 0.5, 1]);
  const feedbackUpOpacity = useTransform(y, [-200, -80, 0], [1, 0.5, 0]);

  const handleDragEnd = (event, info) => {
    setIsDragging(false);

    const { x: offsetX, y: offsetY } = info.offset;
    const threshold = 100;

    if (
      Math.abs(offsetX) > Math.abs(offsetY) &&
      Math.abs(offsetX) > threshold
    ) {
      const direction = offsetX > 0 ? "yes" : "no";
      onSwipe(habit.id, direction);
    } else if (offsetY < -threshold) {
      onSwipe(habit.id, "skip");
    } else {
      x.set(0);
      y.set(0);
    }
  };

  const streak = habit.streak || { currentStreak: 0 };

  return (
    <div className="card-wrapper">
      <motion.div
        className="feedback-overlay feedback-left"
        style={{ opacity: feedbackLeftOpacity }}
      >
        NO
      </motion.div>
      <motion.div
        className="feedback-overlay feedback-right"
        style={{ opacity: feedbackRightOpacity }}
      >
        YES
      </motion.div>
      <motion.div
        className="feedback-overlay feedback-up"
        style={{ opacity: feedbackUpOpacity }}
      >
        SKIP
      </motion.div>

      <motion.div
        className={`swipe-card ${isDragging ? "dragging" : ""}`}
        style={{
          x,
          y,
          rotate,
          cursor: isDragging ? "grabbing" : "grab",
        }}
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.8}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        <div className="card-content">
          {streak.currentStreak > 0 && (
            <div className="streak-badge">
              <span>🔥 {streak.currentStreak} day streak</span>
            </div>
          )}
          <div className="question-text">{habit.question}</div>

          <div className="gesture-hints">
            <div className="hint hint-left">
              <span className="hint-icon">←</span>
              <span className="hint-label">no</span>
            </div>
            <div className="hint hint-up">
              <span className="hint-icon">↑</span>
              <span className="hint-label">skip</span>
            </div>
            <div className="hint hint-right">
              <span className="hint-icon">→</span>
              <span className="hint-label">yes</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SwipeCard;
