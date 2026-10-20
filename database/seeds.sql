-- ============================================================
-- SLWA Seed Data  ─  DEMO ONLY
-- These are clearly labelled sample records for local testing.
-- Do NOT import into a production database without review.
-- Passwords below are hashed bcrypt of "Password1!"
-- ============================================================

USE slwa_db;

-- ─── Users ───────────────────────────────────────────────────
-- Password for all seed users: Password1!
INSERT IGNORE INTO users (id, role_id, full_name, email, password_hash, status) VALUES
  (1, 1, 'Admin User',       'admin@slwa.local',   '$2a$12$FkmVXVl1B7ozKumHIWfYcOqqceuoH8rRlVsWnrtMBMFqxe3g4sMH.', 'active'),
  (2, 2, 'Dr. Meera Sharma', 'meera@slwa.local',   '$2a$12$FkmVXVl1B7ozKumHIWfYcOqqceuoH8rRlVsWnrtMBMFqxe3g4sMH.', 'active'),
  (3, 2, 'Prof. Raj Gupta',  'raj@slwa.local',     '$2a$12$FkmVXVl1B7ozKumHIWfYcOqqceuoH8rRlVsWnrtMBMFqxe3g4sMH.', 'active'),
  (4, 3, 'Demo Student A',   'studenta@slwa.local','$2a$12$FkmVXVl1B7ozKumHIWfYcOqqceuoH8rRlVsWnrtMBMFqxe3g4sMH.', 'active'),
  (5, 3, 'Demo Student B',   'studentb@slwa.local','$2a$12$FkmVXVl1B7ozKumHIWfYcOqqceuoH8rRlVsWnrtMBMFqxe3g4sMH.', 'active');

-- ─── Profiles ────────────────────────────────────────────────
INSERT IGNORE INTO teacher_profiles (user_id, employee_id, department, qualification) VALUES
  (2, 'EMP-001', 'Computer Science', 'PhD Computer Science'),
  (3, 'EMP-002', 'Mathematics',      'M.Sc Mathematics');

INSERT IGNORE INTO student_profiles (user_id, enrollment_no, department, semester) VALUES
  (4, 'STU-2024-001', 'Computer Science', 3),
  (5, 'STU-2024-002', 'Mathematics',      2);

-- ─── Courses ─────────────────────────────────────────────────
INSERT IGNORE INTO courses (id, code, title, description, category, credits, status, created_by) VALUES
  (1, 'CS101', 'Introduction to Programming', 'Fundamentals of programming using Python. Covers variables, control flow, functions, and basic data structures.', 'Computer Science', 3, 'active', 1),
  (2, 'CS202', 'Data Structures & Algorithms', 'In-depth study of arrays, linked lists, trees, graphs, sorting, and searching algorithms.', 'Computer Science', 4, 'active', 1),
  (3, 'MA101', 'Calculus I', 'Limits, derivatives, integrals, and applications. Fundamental theorem of calculus.', 'Mathematics', 3, 'active', 1),
  (4, 'CS301', 'Database Systems', 'Relational databases, SQL, normalization, transactions, and basic query optimization.', 'Computer Science', 3, 'active', 1);

-- ─── Teacher Assignments ─────────────────────────────────────
INSERT IGNORE INTO teacher_course_assignments (teacher_id, course_id) VALUES
  (2, 1), (2, 2), (2, 4),
  (3, 3);

-- ─── Enrollments ─────────────────────────────────────────────
INSERT IGNORE INTO enrollments (student_id, course_id, status) VALUES
  (4, 1, 'active'),
  (4, 2, 'active'),
  (5, 1, 'active'),
  (5, 3, 'active');

-- ─── Exams ───────────────────────────────────────────────────
INSERT IGNORE INTO exams (id, course_id, created_by, title, description, duration_minutes, total_marks, pass_marks, start_time, end_time, status, attempt_limit) VALUES
  (1, 1, 2, 'CS101 Mid-Term Exam', 'Covers chapters 1–5: variables, control flow, functions.', 60, 50, 20, '2026-11-01 09:00:00', '2026-11-30 23:59:59', 'published', 1),
  (2, 2, 2, 'DSA Quiz 1',          'Short quiz on arrays and linked lists.',                   30, 20, 8,  '2026-11-05 10:00:00', '2026-11-30 23:59:59', 'published', 2);

-- ─── Questions ───────────────────────────────────────────────
INSERT IGNORE INTO questions (id, exam_id, question_text, question_type, marks, order_index) VALUES
  -- CS101 Mid-Term
  (1,  1, 'Which keyword is used to define a function in Python?',                         'mcq',         2, 1),
  (2,  1, 'What is the output of print(type(42))?',                                        'mcq',         2, 2),
  (3,  1, 'In Python, a variable must be declared before use. (True/False)',               'true_false',  2, 3),
  (4,  1, 'What does the len() function return?',                                          'short_answer',4, 4),
  (5,  1, 'Which of the following is NOT a Python data type?',                             'mcq',         2, 5),
  -- DSA Quiz 1
  (6,  2, 'Which data structure uses LIFO order?',                                         'mcq',         2, 1),
  (7,  2, 'What is the time complexity of accessing an element in an array by index?',     'mcq',         2, 2),
  (8,  2, 'A singly linked list allows traversal in both directions. (True/False)',        'true_false',  2, 3),
  (9,  2, 'What is the advantage of a linked list over an array?',                         'short_answer',4, 4),
  (10, 2, 'Which operation is O(1) for a stack?',                                          'mcq',         2, 5);

-- ─── Question Options ────────────────────────────────────────
INSERT IGNORE INTO question_options (question_id, option_text, is_correct, order_index) VALUES
  -- Q1
  (1, 'def',      1, 1), (1, 'function', 0, 2), (1, 'func', 0, 3), (1, 'define', 0, 4),
  -- Q2
  (2, "<class 'int'>",   1, 1), (2, "<class 'str'>",  0, 2), (2, 'int', 0, 3), (2, '42', 0, 4),
  -- Q3 (True/False)
  (3, 'True', 0, 1), (3, 'False', 1, 2),
  -- Q5
  (5, 'int', 0, 1), (5, 'float', 0, 2), (5, 'char', 1, 3), (5, 'str', 0, 4),
  -- Q6
  (6, 'Stack', 1, 1), (6, 'Queue', 0, 2), (6, 'Array', 0, 3), (6, 'Heap', 0, 4),
  -- Q7
  (7, 'O(1)', 1, 1), (7, 'O(n)', 0, 2), (7, 'O(log n)', 0, 3), (7, 'O(n²)', 0, 4),
  -- Q8 (True/False)
  (8, 'True', 0, 1), (8, 'False', 1, 2),
  -- Q10
  (10, 'Push', 1, 1), (10, 'Search', 0, 2), (10, 'Sort', 0, 3), (10, 'Traverse', 0, 4);

-- ─── Notifications ───────────────────────────────────────────
INSERT IGNORE INTO notifications (id, created_by, title, message, target_role) VALUES
  (1, 1, 'Welcome to Smart Learning', 'Welcome to the Smart Learning platform. Your account is ready. Explore your courses and resources.', 'all'),
  (2, 1, 'Mid-Term Exams Scheduled',  'Mid-term exams for the current semester are now published. Please check your exam schedule in the Exams section.', 'student'),
  (3, 1, 'Resource Upload Reminder',  'Reminder: Please upload study materials for your assigned courses before the semester begins.', 'teacher');

-- ─── Notification Recipients ─────────────────────────────────
INSERT IGNORE INTO notification_recipients (notification_id, user_id, is_read) VALUES
  (1, 1, 0), (1, 2, 0), (1, 3, 0), (1, 4, 0), (1, 5, 0),
  (2, 4, 0), (2, 5, 0),
  (3, 2, 0), (3, 3, 0);
