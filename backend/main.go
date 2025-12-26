package main

import (
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/esaiaswestberg/klistra-go/handlers"
	"github.com/esaiaswestberg/klistra-go/middleware"
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
	store := cookie.NewStore([]byte("secret")) // TODO: Move secret to env
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
	r.StaticFile("/logo.svg", "../frontend/dist/logo.svg")
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
	api := r.Group("/api")
	{
		api.GET("/token", handlers.GetToken)
		
		// Protected Routes (Transport Encryption)
		protected := api.Group("/")
		protected.Use(middleware.TransportEncryption())
		{
			protected.POST("/submit", handlers.CreatePaste)
			protected.POST("/read.php", handlers.GetPaste) // Maintain legacy path or change? user wants "re-implement", so maybe clean up paths?
			// But frontend script.js uses "api/read.php". If we rewrite frontend, we can change this.
			// Let's use clean paths and update frontend.
			protected.POST("/read", handlers.GetPaste)
			
			protected.POST("/protected.php", handlers.GetPasteStatus) // Legacy path
			protected.POST("/status", handlers.GetPasteStatus)
		}

		api.GET("/session.php", handlers.GetSession) // Legacy path
		api.GET("/session", handlers.GetSession)
	}

	r.Run(":8080")
}
