package services

import (
	"database/sql"
	"fmt"
	"math/rand"
	"time"
)

var wordList = []string{
	"ape", "bat", "bee", "bug", "cat", "cow", "crab", "crow", "dog", "dove", "duck", "eel", "elk", "fox", "frog", "goat", "hare", "hawk", "jay", "lamb", "lion", "mole", "moose", "mouse", "otter", "owl", "panda", "pig", "pony", "rabbit", "rat", "seal", "shark", "sheep", "snail", "snake", "swan", "tiger", "toad", "whale", "wolf", "zebra",
	"apple", "banana", "grape", "kiwi", "lemon", "lime", "mango", "melon", "olive", "orange", "peach", "pear", "plum", "prune", "raisin", "berry",
	"red", "blue", "green", "yellow", "pink", "purple", "teal", "navy", "gold", "ivory", "silver",
	"book", "cup", "door", "bed", "phone", "shoe", "lamp", "clock", "key", "glass", "plate", "spoon", "fork", "bag",
	"paris", "rome", "lima", "cairo", "osaka", "lagos", "milan", "perth", "tokyo", "seoul", "delhi", "dubai", "miami", "berlin", "sydney", "madrid", "london", "venice", "dublin", "vienna",
}

func GenerateID() (string, error) {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	for i := 0; i < 100; i++ {
		word := wordList[r.Intn(len(wordList))]
		digits := r.Intn(90) + 10 // 10-99
		id := fmt.Sprintf("%s%d", word, digits)

		var data string
		var expiresAt int64
		err := DB.QueryRow("SELECT data, expires_at FROM pastes WHERE id = ?", id).Scan(&data, &expiresAt)
		if err == sql.ErrNoRows {
			return id, nil
		}
	}

	// Fallback
	return fallbackGenerator(8), nil
}

func fallbackGenerator(length int) string {
	const charset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[r.Intn(len(charset))]
	}
	return string(b)
}
