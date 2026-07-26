package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/handlers"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	router := gin.Default()
	router.GET("/api/health", handlers.Health)
	router.GET("/api/profile", handlers.Profile)
	router.GET("/api/leaderboard", handlers.Leaderboard)
	router.GET("/api/display-name", handlers.GetDisplayName)
	router.PATCH("/api/display-name", handlers.PatchDisplayName)

	log.Printf("listening on :%s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
