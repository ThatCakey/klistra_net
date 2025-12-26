package services

import (
	"database/sql"
	"fmt"
	"math/rand"
	"time"
)

var adjectives = []string{
	"happy", "fast", "brave", "bright", "calm", "clever", "cool", "eager", "fancy", "gentle",
	"grand", "great", "kind", "lively", "lucky", "mighty", "nice", "noble", "proud", "quick",
	"quiet", "smart", "strong", "sweet", "tough", "wild", "wise", "young", "bold", "crisp",
	"funny", "jolly", "merry", "silly", "sunny", "vivid", "witty", "zesty", "lazy", "busy",
}

var nouns = []string{
	"ape", "bat", "bee", "bug", "cat", "cow", "crab", "crow", "dog", "dove", "duck", "eel",
	"elk", "fox", "frog", "goat", "hare", "hawk", "jay", "lamb", "lion", "mole", "moose",
	"mouse", "otter", "owl", "panda", "pig", "pony", "rabbit", "rat", "seal", "shark",
	"sheep", "snail", "snake", "swan", "tiger", "toad", "whale", "wolf", "zebra",
	"apple", "banana", "grape", "kiwi", "lemon", "lime", "mango", "melon", "olive", "orange",
	"book", "cup", "door", "bed", "phone", "shoe", "lamp", "clock", "key", "glass", "plate",
	"paris", "rome", "lima", "cairo", "osaka", "lagos", "milan", "perth", "tokyo", "seoul",
}

func GenerateID() (string, error) {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	for i := 0; i < 100; i++ {
		adj := adjectives[r.Intn(len(adjectives))]
		noun := nouns[r.Intn(len(nouns))]
		digits := r.Intn(90) + 10 // 10-99
		id := fmt.Sprintf("%s-%s-%d", adj, noun, digits)

		var data string
		var expiresAt int64
		err := DB.QueryRow("SELECT data, expires_at FROM pastes WHERE id = ?", id).Scan(&data, &expiresAt)
		if err == sql.ErrNoRows {
			return id, nil
		}
	}

	// Fallback
	return fallbackGenerator(12), nil
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
