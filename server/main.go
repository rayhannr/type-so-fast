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

	router.POST("/api/rooms", handlers.CreateRoom)
	router.POST("/api/rooms/join", handlers.JoinRoom)
	router.GET("/api/rooms/:sessionId", handlers.GetRoom)
	router.POST("/api/rooms/:sessionId/start", handlers.StartRoom)
	router.POST("/api/rooms/:sessionId/progress", handlers.ProgressRoom)

	router.POST("/api/match-invites", handlers.CreateMatchInvite)
	router.POST("/api/match-invites/accept", handlers.AcceptMatchInvite)
	router.POST("/api/match-invites/decline", handlers.DeclineMatchInvite)

	router.GET("/api/friends", handlers.ListFriends)
	router.POST("/api/friends", handlers.SendFriendRequest)
	router.GET("/api/friends/incoming", handlers.ListIncomingFriendRequests)
	router.DELETE("/api/friends/:userId", handlers.RemoveFriend)
	router.POST("/api/friends/:userId/accept", handlers.AcceptFriendRequest)
	router.POST("/api/friends/:userId/decline", handlers.DeclineFriendRequest)

	router.GET("/api/blocks", handlers.ListBlockedUsers)
	router.POST("/api/blocks", handlers.BlockUser)
	router.DELETE("/api/blocks/:userId", handlers.UnblockUser)

	router.POST("/api/pusher/auth", handlers.PusherAuth)

	log.Printf("listening on :%s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
