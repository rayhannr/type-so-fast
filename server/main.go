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

	router.GET("/api/records", handlers.GetBestRecords)
	router.PUT("/api/records", handlers.PutBestRecords)
	router.GET("/api/history", handlers.GetGameHistory)
	router.PUT("/api/history", handlers.PutGameHistory)
	router.GET("/api/streak", handlers.GetStreak)
	router.PUT("/api/streak", handlers.PutStreak)
	router.GET("/api/progression", handlers.GetProgression)
	router.PUT("/api/progression", handlers.PutProgression)
	router.GET("/api/pvc-progress", handlers.GetPvcProgress)
	router.PUT("/api/pvc-progress", handlers.PutPvcProgress)
	router.GET("/api/pvp-progress", handlers.GetPvpProgress)
	router.PUT("/api/pvp-progress", handlers.PutPvpProgress)
	router.GET("/api/room-progress", handlers.GetRoomProgress)
	router.PUT("/api/room-progress", handlers.PutRoomProgress)
	router.GET("/api/settings", handlers.GetSettings)
	router.PUT("/api/settings", handlers.PutSettings)

	router.POST("/api/matchmaking", handlers.CreateMatchTicket)
	router.GET("/api/matchmaking/:ticketId", handlers.GetMatchTicketStatus)
	router.DELETE("/api/matchmaking/:ticketId", handlers.CancelMatchTicket)

	router.GET("/api/achievements", handlers.ListAchievements)
	router.POST("/api/achievements", handlers.SubmitAchievements)
	router.GET("/api/achievements/list", handlers.AchievementsCatalog)

	router.GET("/api/session/:id", handlers.GetSession)
	router.PATCH("/api/session/:id", handlers.SetSessionAttributes)
	router.DELETE("/api/session/:id", handlers.LeaveSession)

	router.GET("/api/stats", handlers.GetPersonalStats)
	router.POST("/api/stats", handlers.SubmitGameStats)

	router.POST("/api/auth", handlers.LoginWithDeviceID)
	router.POST("/api/auth/google", handlers.LoginWithGoogle)
	router.POST("/api/auth/link-google", handlers.LinkGoogleAccount)
	router.POST("/api/auth/unlink-google", handlers.UnlinkGoogleAccount)
	router.GET("/api/auth/google-status", handlers.GoogleLinkStatus)

	log.Printf("listening on :%s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
