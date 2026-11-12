-- 서버가 시작할 때 자동으로 만들어지지만, 직접 만들고 싶으면 이 파일을 실행하세요.
-- mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS mibs_form;

USE mibs_form;

CREATE TABLE IF NOT EXISTS students (
  id      INT PRIMARY KEY AUTO_INCREMENT,  -- 자동 증가
  number  VARCHAR(10) NOT NULL UNIQUE,     -- 학번 (학번당 1번만 신청)
  name    VARCHAR(10) NOT NULL,            -- 이름
  time    VARCHAR(10) NOT NULL UNIQUE      -- 선택한 시간 (HH:MM, 한 시간에 1명)
);
