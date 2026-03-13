CREATE TABLE daily_logs (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  walking_10k BOOLEAN DEFAULT FALSE,
  walking_after_meals BOOLEAN DEFAULT FALSE,
  pushups INTEGER DEFAULT 0,
  plank BOOLEAN DEFAULT FALSE,
  plank_time INTEGER,
  brainstorming BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE weekly_logs (
  id SERIAL PRIMARY KEY,
  week_start DATE NOT NULL UNIQUE,
  yoga BOOLEAN DEFAULT FALSE,
  pilates BOOLEAN DEFAULT FALSE,
  weightlifting INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bingo_items (
  id SERIAL PRIMARY KEY,
  position INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO bingo_items (position, title) VALUES
(0, 'I got a tattoo'),
(1, 'I went on a solo trip'),
(2, 'I learnt how to ski'),
(3, 'I ran a mile without stopping / walking'),
(4, 'I went to a surf retreat'),
(5, 'I did a handstand'),
(6, 'I did a push up'),
(7, 'I did a pull up'),
(8, 'I did a pilates class without breaks'),
(9, 'I did a pistol squat'),
(10, 'I got my driver''s license'),
(11, 'I went to NYFW'),
(12, 'I learnt how to do a blowout'),
(13, 'I did a 2 min plank'),
(14, 'I wore a full outfit designed by me'),
(15, 'I had a phone free day'),
(16, 'I wore one completely thrifted outfit'),
(17, 'I took 5 hot pinterest worthy photos'),
(18, 'I did a challenging hike'),
(19, 'I got paid for non-SAF work'),
(20, 'I made a really good insta dump'),
(21, 'I got PR sent to me'),
(22, 'I had a reel go viral'),
(23, 'I got rejected 10 times'),
(24, 'I got invited to a brand event');
