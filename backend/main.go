package main

import (
	"os"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/esaiaswestberg/klistra-go/api"
	"github.com/esaiaswestberg/klistra-go/handlers"
	"github.com/esaiaswestberg/klistra-go/services"
)

func main() {
	// Init Services
	services.InitDB()
	
	// Start Cleanup Routine
	go func() {
		for {
			services.CleanExpired()
			time.Sleep(1 * time.Minute)
		}
	}()

	r := gin.Default()

	// Session Store
	sessionSecret := os.Getenv("SESSION_SECRET")
	if sessionSecret == "" {
		sessionSecret = "default-secret-change-me"
	}
	store := cookie.NewStore([]byte(sessionSecret))
	r.Use(sessions.Sessions("mysession", store))

	// CORS? PHP had Allow-Origin *
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Static Files (Frontend)
	r.Static("/assets", "../frontend/dist/assets")
	r.StaticFile("/vite.svg", "../frontend/dist/vite.svg")
	
	// SPA Fallback
	r.NoRoute(func(c *gin.Context) {
		// If path starts with /api, return 404
		if len(c.Request.URL.Path) >= 4 && c.Request.URL.Path[:4] == "/api" {
			c.JSON(404, gin.H{"error": "API endpoint not found"})
			return
		}
		c.File("../frontend/dist/index.html")
	})

	// API Routes
	server := handlers.NewServer()
	apiGroup := r.Group("/api")
	api.RegisterHandlers(apiGroup, server)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(":" + port)
}
