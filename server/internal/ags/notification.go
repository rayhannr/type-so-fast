package ags

import (
	"encoding/json"

	lobby "github.com/AccelByte/accelbyte-go-modular-sdk/lobby-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/lobby-sdk/pkg/lobbyclient/notification"
	"github.com/AccelByte/accelbyte-go-modular-sdk/lobby-sdk/pkg/lobbyclientmodels"

	"type-so-fast-server/internal/agsconfig"
)

// Every freeform notification this game sends rides one topic; the event name inside the payload
// is what receivers actually branch on.
const notificationTopic = "typesofast"

func newNotificationService(accessToken string) *lobby.NotificationService {
	configRepo := agsconfig.Player()
	return &lobby.NotificationService{
		Client:           lobby.NewLobbyClient(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(accessToken),
	}
}

// Lobby carries a freeform notification as a single opaque string, so the event name travels
// inside the payload rather than as a separate field the way a Pusher event name would.
func notificationPayload(event string, data map[string]any) (string, error) {
	if data == nil {
		data = map[string]any{}
	}
	data["event"] = event

	encoded, err := json.Marshal(data)
	if err != nil {
		return "", err
	}
	return string(encoded), nil
}

// NotifyUser pushes an event down one player's Lobby websocket. Delivery reaches whichever server
// instance holds that player's socket, so no shared bus is needed between instances.
func NotifyUser(userID, event string, data map[string]any) error {
	message, err := notificationPayload(event, data)
	if err != nil {
		return err
	}
	adminAccessToken, err := GetAdminAccessToken()
	if err != nil {
		return err
	}

	topic := notificationTopic
	params := notification.NewSendSpecificUserFreeformNotificationV1AdminParams()
	params.Namespace = agsconfig.Namespace()
	params.UserID = userID
	params.Body = &lobbyclientmodels.ModelFreeFormNotificationRequestV1{Message: &message, TopicName: &topic}

	return newNotificationService(adminAccessToken).SendSpecificUserFreeformNotificationV1AdminShort(params)
}

// NotifyUsers is the fan-out equivalent for room events. Lobby has no channel concept, so the
// caller resolves the room to its member list and addresses them explicitly.
func NotifyUsers(userIDs []string, event string, data map[string]any) error {
	if len(userIDs) == 0 {
		return nil
	}

	message, err := notificationPayload(event, data)
	if err != nil {
		return err
	}
	adminAccessToken, err := GetAdminAccessToken()
	if err != nil {
		return err
	}

	topic := notificationTopic
	params := notification.NewSendMultipleUsersFreeformNotificationV1AdminParams()
	params.Namespace = agsconfig.Namespace()
	params.Body = &lobbyclientmodels.ModelBulkUsersFreeFormNotificationRequestV1{
		Message:   &message,
		TopicName: &topic,
		UserIds:   userIDs,
	}

	return newNotificationService(adminAccessToken).SendMultipleUsersFreeformNotificationV1AdminShort(params)
}
