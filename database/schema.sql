-- ============================================================
-- SLWA Database Schema
-- Smart Learning Web Application
-- Run this script first, then seeds.sql for demo data.
-- ============================================================

CREATE DATABASE IF NOT EXISTS slwa_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE slwa_db;

-- ─── Persistent Express Sessions ──────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  sid          VARCHAR(128) NOT NULL,
  session_data JSON         NOT NULL,
  expires      BIGINT       NOT NULL,
  PRIMARY KEY (sid),
  KEY idx_user_sessions_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Roles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id         TINYINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  name       VARCHAR(20)        NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO roles (id, name) VALUES
  (1, 'admin'),
  (2, 'teacher'),
  (3, 'student');

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                 INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  role_id            TINYINT UNSIGNED   NOT NULL,
  full_name          VARCHAR(120)       NOT NULL,
  email              VARCHAR(191)       NOT NULL,
  password_hash      VARCHAR(255)       NOT NULL,
  status             ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  reset_token        VARCHAR(255)       NULL,
  reset_token_expiry DATETIME           NULL,
  created_at         DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY fk_users_role (role_id),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Student Profiles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_profiles (
  id            INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED   NOT NULL,
  enrollment_no VARCHAR(30)    NULL,
  phone         VARCHAR(20)    NULL,
  department    VARCHAR(100)   NULL,
  semester      TINYINT        NULL,
  bio           TEXT           NULL,
  avatar_path   VARCHAR(255)   NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sp_user (user_id),
  CONSTRAINT fk_sp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Teacher Profiles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_profiles (
  id            INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED   NOT NULL,
  employee_id   VARCHAR(30)    NULL,
  phone         VARCHAR(20)    NULL,
  department    VARCHAR(100)   NULL,
  qualification VARCHAR(200)   NULL,
  bio           TEXT           NULL,
  avatar_path   VARCHAR(255)   NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tp_user (user_id),
  CONSTRAINT fk_tp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Courses ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  code        VARCHAR(20)    NOT NULL,
  title       VARCHAR(200)   NOT NULL,
  description TEXT           NULL,
  category    VARCHAR(100)   NULL,
  credits     TINYINT        NOT NULL DEFAULT 3,
  status      ENUM('active','inactive','archived') NOT NULL DEFAULT 'active',
  created_by  INT UNSIGNED   NULL,
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_courses_code (code),
  KEY fk_courses_creator (created_by),
  CONSTRAINT fk_courses_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Teacher-Course Assignments ──────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_course_assignments (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  teacher_id  INT UNSIGNED   NOT NULL,
  course_id   INT UNSIGNED   NOT NULL,
  assigned_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tca (teacher_id, course_id),
  KEY fk_tca_course (course_id),
  CONSTRAINT fk_tca_teacher FOREIGN KEY (teacher_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_tca_course  FOREIGN KEY (course_id)  REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Enrollments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
  id            INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  student_id    INT UNSIGNED   NOT NULL,
  course_id     INT UNSIGNED   NOT NULL,
  status        ENUM('active','completed','dropped') NOT NULL DEFAULT 'active',
  enrolled_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at  DATETIME       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enroll (student_id, course_id),
  KEY fk_enroll_course (course_id),
  CONSTRAINT fk_enroll_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_enroll_course  FOREIGN KEY (course_id)  REFERENCES courses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Study Resources ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_resources (
  id            INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  course_id     INT UNSIGNED   NOT NULL,
  uploaded_by   INT UNSIGNED   NULL,
  title         VARCHAR(200)   NOT NULL,
  description   TEXT           NULL,
  file_path     VARCHAR(500)   NOT NULL,
  original_name VARCHAR(255)   NOT NULL,
  file_type     VARCHAR(100)   NULL,
  file_size     INT UNSIGNED   NULL,
  created_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_sr_course   (course_id),
  KEY fk_sr_uploader (uploaded_by),
  CONSTRAINT fk_sr_course   FOREIGN KEY (course_id)   REFERENCES courses (id) ON DELETE CASCADE,
  CONSTRAINT fk_sr_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Exams ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  course_id       INT UNSIGNED   NOT NULL,
  created_by      INT UNSIGNED   NULL,
  title           VARCHAR(200)   NOT NULL,
  description     TEXT           NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  total_marks     SMALLINT UNSIGNED NOT NULL DEFAULT 100,
  pass_marks      SMALLINT UNSIGNED NOT NULL DEFAULT 40,
  start_time      DATETIME       NULL,
  end_time        DATETIME       NULL,
  status          ENUM('draft','published','closed') NOT NULL DEFAULT 'draft',
  attempt_limit   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_exams_course  (course_id),
  KEY fk_exams_creator (created_by),
  CONSTRAINT fk_exams_course  FOREIGN KEY (course_id)  REFERENCES courses (id) ON DELETE CASCADE,
  CONSTRAINT fk_exams_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Questions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  exam_id         INT UNSIGNED   NOT NULL,
  question_text   TEXT           NOT NULL,
  question_type   ENUM('mcq','true_false','short_answer') NOT NULL DEFAULT 'mcq',
  marks           TINYINT UNSIGNED NOT NULL DEFAULT 1,
  order_index     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY fk_q_exam (exam_id),
  CONSTRAINT fk_q_exam FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Question Options ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_options (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  question_id INT UNSIGNED   NOT NULL,
  option_text TEXT           NOT NULL,
  is_correct  TINYINT(1)     NOT NULL DEFAULT 0,
  order_index TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY fk_qo_question (question_id),
  CONSTRAINT fk_qo_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Exam Attempts ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_attempts (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  exam_id         INT UNSIGNED   NOT NULL,
  student_id      INT UNSIGNED   NOT NULL,
  started_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at    DATETIME       NULL,
  score           DECIMAL(6,2)   NULL,
  status          ENUM('in_progress','submitted','graded','timed_out') NOT NULL DEFAULT 'in_progress',
  PRIMARY KEY (id),
  KEY fk_ea_exam    (exam_id),
  KEY fk_ea_student (student_id),
  CONSTRAINT fk_ea_exam    FOREIGN KEY (exam_id)    REFERENCES exams (id) ON DELETE CASCADE,
  CONSTRAINT fk_ea_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Attempt Answers ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attempt_answers (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  attempt_id      INT UNSIGNED   NOT NULL,
  question_id     INT UNSIGNED   NOT NULL,
  selected_option INT UNSIGNED   NULL,      -- FK to question_options; NULL for short_answer
  text_answer     TEXT           NULL,      -- for short_answer type
  is_correct      TINYINT(1)     NULL,      -- NULL until graded
  marks_awarded   DECIMAL(4,2)   NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_aa (attempt_id, question_id),
  KEY fk_aa_question (question_id),
  KEY fk_aa_option   (selected_option),
  CONSTRAINT fk_aa_attempt  FOREIGN KEY (attempt_id)      REFERENCES exam_attempts (id) ON DELETE CASCADE,
  CONSTRAINT fk_aa_question FOREIGN KEY (question_id)     REFERENCES questions (id) ON DELETE CASCADE,
  CONSTRAINT fk_aa_option   FOREIGN KEY (selected_option) REFERENCES question_options (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Notifications ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  created_by  INT UNSIGNED   NULL,
  title       VARCHAR(200)   NOT NULL,
  message     TEXT           NOT NULL,
  target_role ENUM('all','student','teacher','admin') NOT NULL DEFAULT 'all',
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_notif_creator (created_by),
  CONSTRAINT fk_notif_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Notification Recipients ─────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_recipients (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  notification_id INT UNSIGNED   NOT NULL,
  user_id         INT UNSIGNED   NOT NULL,
  is_read         TINYINT(1)     NOT NULL DEFAULT 0,
  read_at         DATETIME       NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nr (notification_id, user_id),
  KEY fk_nr_user (user_id),
  CONSTRAINT fk_nr_notification FOREIGN KEY (notification_id) REFERENCES notifications (id) ON DELETE CASCADE,
  CONSTRAINT fk_nr_user         FOREIGN KEY (user_id)         REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Feedback ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  student_id  INT UNSIGNED   NOT NULL,
  course_id   INT UNSIGNED   NOT NULL,
  rating      TINYINT UNSIGNED NOT NULL,        -- 1-5
  comment     TEXT           NULL,
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_feedback (student_id, course_id),
  KEY fk_fb_course (course_id),
  CONSTRAINT fk_fb_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_fb_course  FOREIGN KEY (course_id)  REFERENCES courses (id) ON DELETE CASCADE,
  CONSTRAINT chk_rating    CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
