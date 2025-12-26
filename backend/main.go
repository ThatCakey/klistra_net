package main

import (
	"embed"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/esaiaswestberg/klistra-go/api"
	"github.com/esaiaswestberg/klistra-go/handlers"
	"github.com/esaiaswestberg/klistra-go/services"
)

//go:embed static/*
var staticFS embed.FS

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

	// Helper to serve file with external override support
	serveFile := func(path string, embeddedPath string) gin.HandlerFunc {
		return func(c *gin.Context) {
			extDir := os.Getenv("EXTERNAL_STATIC_DIR")
			if extDir == "" {
				extDir = "/app/static"
			}
			// Clean path and join with extDir
			target := filepath.Join(extDir, filepath.Clean(path))
			if info, err := os.Stat(target); err == nil && !info.IsDir() {
				c.File(target)
				return
			}
			c.FileFromFS(embeddedPath, http.FS(staticFS))
		}
	}

	r.GET("/favicon.svg", serveFile("favicon.svg", "static/favicon.svg"))
	r.GET("/sitemap.xml", func(c *gin.Context) {
		extDir := os.Getenv("EXTERNAL_STATIC_DIR")
		if extDir == "" {
			extDir = "/app/static"
		}
		target := filepath.Join(extDir, "sitemap.xml")
		if info, err := os.Stat(target); err == nil && !info.IsDir() {
			c.File(target)
			return
		}

		scheme := "https"
		if c.Request.TLS == nil && c.GetHeader("X-Forwarded-Proto") != "https" {
			scheme = "http"
		}
		baseURL := scheme + "://" + c.Request.Host
		now := time.Now().Format("2006-01-02")

		sitemap := `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>` + baseURL + `/</loc>
        <lastmod>` + now + `</lastmod>
        <changefreq>monthly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>` + baseURL + `/privacy</loc>
        <lastmod>` + now + `</lastmod>
        <changefreq>yearly</changefreq>
        <priority>0.5</priority>
    </url>
</urlset>`
		c.Header("Content-Type", "application/xml")
		c.String(http.StatusOK, sitemap)
	})
	r.GET("/robots.txt", serveFile("robots.txt", "static/robots.txt"))
	
	// SPA Fallback & External Static Files
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// Check external static dir (e.g. for Google Search Console verification)
		extDir := os.Getenv("EXTERNAL_STATIC_DIR")
		if extDir == "" {
			extDir = "/app/static"
		}
		
		// Securely join and check if file exists in the external directory
		target := filepath.Join(extDir, filepath.Clean(path))
		if info, err := os.Stat(target); err == nil && !info.IsDir() {
			c.File(target)
			return
		}

		// If path starts with /api, return 404
		if len(path) >= 4 && path[:4] == "/api" {
			c.JSON(404, gin.H{"error": "API endpoint not found"})
			return
		}

		// Serve index.html with optional custom head injection
		index := "../frontend/dist/index.html"
		customHead := os.Getenv("CUSTOM_HEAD_HTML")
		if customHead != "" {
			content, err := os.ReadFile(index)
			if err == nil {
				html := string(content)
				// Inject before </head>
				if strings.Contains(html, "</head>") {
					html = strings.Replace(html, "</head>", customHead+"</head>", 1)
					c.Header("Content-Type", "text/html; charset=utf-8")
					c.String(200, html)
					return
				}
			}
		}
		c.File(index)
	})

	// API Routes
	server := handlers.NewServer()
	apiGroup := r.Group("/api")

	// Serve OpenAPI Spec & Swagger UI
	r.GET("/api/openapi.yaml", serveFile("api/openapi.yaml", "static/openapi.yaml"))
	r.GET("/api", func(c *gin.Context) {
		c.Header("Content-Type", "text/html")
		c.String(200, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="SwaggerUI" />
  <title>Klistra.nu API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
<script>
  window.onload = () => {
    window.ui = SwaggerUIBundle({
      url: '/api/openapi.yaml',
      dom_id: '#swagger-ui',
    });
  };
</script>
</body>
</html>`)
	})

	api.RegisterHandlers(apiGroup, server)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(":" + port)
}
