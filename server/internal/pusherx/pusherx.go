package pusherx

import (
	"net/url"
	"os"

	"github.com/pusher/pusher-http-go/v5"
)

func client() *pusher.Client {
	return &pusher.Client{
		AppID:   os.Getenv("PUSHER_APP_ID"),
		Key:     os.Getenv("PUSHER_KEY"),
		Secret:  os.Getenv("PUSHER_SECRET"),
		Cluster: os.Getenv("PUSHER_CLUSTER"),
		Secure:  true,
	}
}

func Trigger(channel, event string, data interface{}) error {
	return client().Trigger(channel, event, data)
}

// AuthorizePrivate mirrors lib/pusher.ts's authenticate() for a plain private channel: no member
// data, just a signature over socket_id + channel_name.
func AuthorizePrivate(socketID, channelName string) ([]byte, error) {
	params := url.Values{"socket_id": {socketID}, "channel_name": {channelName}}.Encode()
	return client().AuthorizePrivateChannel([]byte(params))
}

// AuthorizePresence mirrors lib/pusher.ts's authenticate() with presenceData: carries the caller's
// userId so Pusher's presence channel can report who's online.
func AuthorizePresence(socketID, channelName, userID string) ([]byte, error) {
	params := url.Values{"socket_id": {socketID}, "channel_name": {channelName}}.Encode()
	return client().AuthorizePresenceChannel([]byte(params), pusher.MemberData{UserID: userID})
}
