CREATE DATABASE IF NOT EXISTS prison_rehab_system;
USE prison_rehab_system;


CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'instructor', 'viewer', 'staff') DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO users (id, username, password, role) VALUES 
(1, 'admin', '$2b$10$rTKlMkLkqBqBqBqBqBqBqOeXlXlXlXlXlXlXlXlXlXlXlXlX', 'admin'),
(2, 'instructor1', '$2b$10$rTKlMkLkqBqBqBqBqBqBqOeXlXlXlXlXlXlXlXlXlXlXlXlX', 'instructor'),
(3, 'viewer1', '$2b$10$rTKlMkLkqBqBqBqBqBqBqOeXlXlXlXlXlXlXlXlXlXlXlXlX', 'viewer');


CREATE TABLE IF NOT EXISTS prisoners (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    gender ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
    age INT,
    sentence_length VARCHAR(50),
    prison_block VARCHAR(100),
    enrollment_status ENUM('Enrolled', 'Not Enrolled', 'Completed') DEFAULT 'Not Enrolled',
    education VARCHAR(100),
    skills TEXT,
    marital_status VARCHAR(50),
    notes TEXT,
    image_url VARCHAR(255),
    admission_date DATE DEFAULT (CURDATE()),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    program_type ENUM('Vocational', 'Educational', 'Behavioral') DEFAULT 'Vocational',
    instructor VARCHAR(100),
    duration VARCHAR(50),
    prerequisite TEXT,
    description TEXT,
    thumbnail_url VARCHAR(255),
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    max_capacity INT DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS enrolled_programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    prisoner_id INT,
    program_id INT,
    enrollment_date DATE,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    status ENUM('In Progress', 'Completed', 'On Warning', 'Dropped') DEFAULT 'In Progress',
    FOREIGN KEY (prisoner_id) REFERENCES prisoners(id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    session_date DATETIME,
    duration VARCHAR(50),
    coordinator VARCHAR(100),
    prisoner_id INT,
    notes TEXT,
    status ENUM('Scheduled', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
    FOREIGN KEY (prisoner_id) REFERENCES prisoners(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS staff (
    id INT PRIMARY KEY AUTO_INCREMENT,
    staff_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    gender ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
    age INT,
    education VARCHAR(100),
    facility VARCHAR(100),
    role VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    employment_status ENUM('Active', 'On leave', 'Inactive') DEFAULT 'Active',
    image_url VARCHAR(255),
    hire_date DATE DEFAULT (CURDATE())
);


CREATE TABLE IF NOT EXISTS facilities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    capacity INT,
    status ENUM('Complete', 'Under Maintenance', 'Inactive') DEFAULT 'Complete'
);


CREATE TABLE IF NOT EXISTS instructor_programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    program_id INT NOT NULL,
    assigned_date DATE DEFAULT (CURDATE()),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assignment (user_id, program_id)
);


CREATE TABLE IF NOT EXISTS case_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    prisoner_id INT NOT NULL,
    assigned_date DATE DEFAULT (CURDATE()),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (prisoner_id) REFERENCES prisoners(id) ON DELETE CASCADE,
    UNIQUE KEY unique_case (user_id, prisoner_id)
);


CREATE TABLE IF NOT EXISTS activity_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    username VARCHAR(50),
    action VARCHAR(255),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);


CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_prisoners_name ON prisoners(name);
CREATE INDEX idx_prisoners_status ON prisoners(enrollment_status);
CREATE INDEX idx_programs_status ON programs(status);
CREATE INDEX idx_sessions_date ON sessions(session_date);




INSERT INTO facilities (id, name, capacity, status) VALUES 
(1, 'Kality Maremiya', 430, 'Complete'),
(2, 'Daleti Maremiya', 374, 'Complete'),
(3, 'Sebbeta Maremiya', 120, 'Complete'),
(4, 'Kality Maremiya2', 122, 'Under Maintenance');


INSERT INTO prisoners (id, id_number, name, gender, age, sentence_length, prison_block, enrollment_status, education, skills) VALUES 
(1, 'EPDR/77890', 'Markos Smith', 'Male', 31, '10 Years', 'Kaliti', 'Enrolled', 'High School', 'Carpentry, Woodworking'),
(2, 'EPDR/77891', 'Abubeker Nebiyu', 'Male', 29, '5 Years', 'Kaliti', 'Enrolled', 'Bachelor\'s', 'Teaching, Leadership'),
(3, 'EPDR/77892', 'Samuel Kebede', 'Male', 41, '8 Years', 'Daleti', 'Enrolled', 'High School', 'Farming, Agriculture'),
(4, 'EPDR/77893', 'Shelema Chala', 'Male', 39, '3 Years', 'Sebbeta', 'Enrolled', 'Diploma', 'Mechanics, Repair'),
(5, 'EPDR/77894', 'Habtom Seyoum', 'Male', 42, '15 Years', 'Kaliti', 'Not Enrolled', 'High School', 'Construction');


INSERT INTO programs (id, name, program_type, instructor, duration, description, status, max_capacity) VALUES 
(1, 'Advanced Carpentry', 'Vocational', 'Ayinalem mulatu', '6 months', 'Professional carpentry and woodworking skills', 'Active', 50),
(2, 'GED Completion', 'Educational', 'Liam Rosenniro', '4 months', 'High school equivalency preparation', 'Active', 45),
(3, 'Anger Management', 'Behavioral', 'Sarah Jenkins', '3 months', 'Behavioral therapy and anger control', 'Active', 40),
(4, 'Digital Literacy', 'Educational', 'Ayele Kebede', '2 months', 'Basic computing and digital skills', 'Active', 50),
(5, 'Art and Design', 'Vocational', 'Ayinalem mulatu', '4 months', 'Creative arts and design principles', 'Active', 45),
(6, 'Substance Abuse Program', 'Behavioral', 'Dr. Helen Clark', '6 months', 'Addiction recovery and support', 'Active', 50);


INSERT INTO enrolled_programs (id, prisoner_id, program_id, enrollment_date, completion_percentage, status) VALUES 
(1, 1, 1, '2023-10-03', 90, 'Completed'),
(2, 1, 2, '2023-10-03', 30, 'In Progress'),
(3, 1, 3, '2023-10-03', 80, 'Completed'),
(4, 2, 1, '2023-11-15', 45, 'In Progress'),
(5, 3, 4, '2023-09-20', 100, 'Completed'),
(6, 4, 3, '2023-12-01', 60, 'In Progress'),
(7, 5, 4, '2023-10-10', 25, 'On Warning');


INSERT INTO sessions (id, title, location, session_date, duration, coordinator, prisoner_id, status) VALUES 
(1, 'Vocational Workshop', 'Workshop Building', '2024-04-25 10:00:00', '2 hours', 'Ayinalem mulatu', 1, 'Completed'),
(2, 'Counseling Session', 'Counseling Center', '2024-04-24 14:00:00', '1 hour', 'Sarah Jenkins', 1, 'Completed'),
(3, 'Library Access', 'Library', '2024-04-23 11:00:00', '1 hour', 'Librarian', 1, 'Completed'),
(4, 'Carpentry Class', 'Workshop', '2024-04-26 09:00:00', '3 hours', 'Ayinalem mulatu', 2, 'Scheduled'),
(5, 'Computer Lab', 'Computer Room', '2024-04-24 13:00:00', '2 hours', 'Ayele Kebede', 3, 'Completed');


INSERT INTO staff (staff_id, name, gender, age, education, facility, role, email, employment_status) VALUES 
('STF/001', 'Dr. Sarah Jenkins', 'Female', 45, 'PhD Psychology', 'Kaliti', 'Lead Instructor', 'sarah.jenkins@rehab.gov', 'Active'),
('STF/002', 'Markos Smith', 'Male', 38, 'Masters Social Work', 'Daleti', 'Case Manager', 'markos.smith@rehab.gov', 'Active'),
('STF/003', 'Helena Mulatu', 'Female', 42, 'Masters Counseling', 'Kaliti', 'Lead Counselor', 'helena.mulatu@rehab.gov', 'On leave'),
('STF/004', 'Prof. Abel Chala', 'Male', 55, 'PhD Education', 'Sebbeta', 'Instructor', 'abel.chala@rehab.gov', 'Active'),
('STF/005', 'Ins. Alemu Tola', 'Male', 35, 'Bachelor\'s', 'Kaliti', 'Security Liaison', 'alemu.tola@rehab.gov', 'Active'),
('STF/006', 'Lomi Debebe', 'Female', 40, 'Masters', 'Daleti', 'Assistant Professor', 'lomi.debebe@rehab.gov', 'On leave');




INSERT INTO instructor_programs (user_id, program_id) VALUES 
(2, 1), (2, 2), (2, 3)
ON DUPLICATE KEY UPDATE assigned_date = CURDATE();


INSERT INTO case_assignments (user_id, prisoner_id) VALUES 
(2, 1), (2, 2), (2, 3)
ON DUPLICATE KEY UPDATE assigned_date = CURDATE();


SELECT '=== USERS ===' AS '';
SELECT id, username, role FROM users;

SELECT '=== LOGIN TEST ===' AS '';
SELECT 'Use username: admin, password: admin123' AS message;
SELECT 'Use username: instructor1, password: admin123' AS message;
SELECT 'Use username: viewer1, password: admin123' AS message;