package services

import (
	"database/sql"
	"log"
	"os"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB() {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "klistra.db"
	}

	var err error
	DB, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatal(err)
	}

	createTableQuery := `
	CREATE TABLE IF NOT EXISTS pastes (
		id TEXT PRIMARY KEY,
		data TEXT,
		expires_at INTEGER
	);
	`
	_, err = DB.Exec(createTableQuery)
	if err != nil {
		log.Fatal(err)
	}
}

func Set(key string, value string, expiration time.Duration) error {
	expiresAt := time.Now().Add(expiration).Unix()
	_, err := DB.Exec("INSERT OR REPLACE INTO pastes (id, data, expires_at) VALUES (?, ?, ?)", key, value, expiresAt)
	return err
}

func Get(key string) (string, error) {
	var data string
	var expiresAt int64
	err := DB.QueryRow("SELECT data, expires_at FROM pastes WHERE id = ?", key).Scan(&data, &expiresAt)
	if err != nil {
		return "", err
	}

	if time.Now().Unix() > expiresAt {
		_ = Delete(key)
		return "", sql.ErrNoRows
	}

	return data, nil
}

func Delete(key string) error {
	_, err := DB.Exec("DELETE FROM pastes WHERE id = ?", key)
	return err
}

func CleanExpired() {
	_, err := DB.Exec("DELETE FROM pastes WHERE expires_at < ?", time.Now().Unix())
	if err != nil {
		log.Println("Error cleaning expired pastes:", err)
	}
}
