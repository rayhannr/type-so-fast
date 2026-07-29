package ags

import (
	"encoding/json"
	"fmt"
	"net/http"

	lobby "github.com/AccelByte/accelbyte-go-modular-sdk/lobby-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/lobby-sdk/pkg/lobbyclient/friends"
	"github.com/AccelByte/accelbyte-go-modular-sdk/lobby-sdk/pkg/lobbyclient/player"
	"github.com/AccelByte/accelbyte-go-modular-sdk/lobby-sdk/pkg/lobbyclientmodels"

	"type-so-fast-server/internal/agsconfig"
)

func newFriendsService(accessToken string) *lobby.FriendsService {
	configRepo := agsconfig.Player()
	return &lobby.FriendsService{
		Client:           lobby.NewLobbyClient(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(accessToken),
	}
}

func newPlayerService(accessToken string) *lobby.PlayerService {
	configRepo := agsconfig.Player()
	return &lobby.PlayerService{
		Client:           lobby.NewLobbyClient(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(accessToken),
	}
}

// getFriendIDs calls a self-scoped /friends/.../me* endpoint directly rather than through the
// generated GetListOfFriendsShort/GetUserIncomingFriendsShort methods: those (like
// getFriendsMe/getFriendsMeIncoming in the TS SDK — see lib/ags/social.ts) declare the response as
// a one-element array, but AGS actually returns the plain `{friendIDs, paging}` object, so the
// generated client fails to unmarshal it (confirmed live: "json: cannot unmarshal object into Go
// value of type []*lobbyclientmodels.Model...Response"). GetListOfFriendsShort also turned out to
// route to an admin-only endpoint entirely, 404ing for a plain player token.
func getFriendIDs(accessToken, path string) ([]string, error) {
	url := fmt.Sprintf("%s/friends/namespaces/%s/%s", agsconfig.Player().BaseURL, agsconfig.Namespace(), path)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET %s: unexpected status %d", url, resp.StatusCode)
	}

	var body struct {
		FriendIDs []string `json:"friendIDs"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}
	return body.FriendIDs, nil
}

func ListFriends(accessToken string) ([]string, error) {
	return getFriendIDs(accessToken, "me")
}

func ListIncomingFriendRequests(accessToken string) ([]string, error) {
	return getFriendIDs(accessToken, "me/incoming")
}

func SendFriendRequest(accessToken, friendPublicID string) error {
	service := newFriendsService(accessToken)
	params := friends.NewUserRequestFriendParams()
	params.Namespace = agsconfig.Namespace()
	params.Body = &lobbyclientmodels.ModelUserRequestFriendRequest{FriendPublicID: friendPublicID}
	return service.UserRequestFriendShort(params)
}

func AcceptFriendRequest(accessToken, friendID string) error {
	service := newFriendsService(accessToken)
	params := friends.NewUserAcceptFriendRequestParams()
	params.Namespace = agsconfig.Namespace()
	params.Body = &lobbyclientmodels.ModelUserAcceptFriendRequest{FriendID: &friendID}
	return service.UserAcceptFriendRequestShort(params)
}

func DeclineFriendRequest(accessToken, friendID string) error {
	service := newFriendsService(accessToken)
	params := friends.NewUserRejectFriendRequestParams()
	params.Namespace = agsconfig.Namespace()
	params.Body = &lobbyclientmodels.ModelUserRejectFriendRequest{FriendID: &friendID}
	return service.UserRejectFriendRequestShort(params)
}

func RemoveFriend(accessToken, friendID string) error {
	service := newFriendsService(accessToken)
	params := friends.NewUserUnfriendRequestParams()
	params.Namespace = agsconfig.Namespace()
	params.Body = &lobbyclientmodels.ModelUserUnfriendRequest{FriendID: &friendID}
	return service.UserUnfriendRequestShort(params)
}

func BlockUser(accessToken, userID string) error {
	service := newPlayerService(accessToken)
	params := player.NewPublicPlayerBlockPlayersV1Params()
	params.Namespace = agsconfig.Namespace()
	params.Body = &lobbyclientmodels.ModelsBlockPlayerRequest{BlockedUserID: &userID}
	return service.PublicPlayerBlockPlayersV1Short(params)
}

func UnblockUser(accessToken, userID string) error {
	service := newPlayerService(accessToken)
	params := player.NewPublicUnblockPlayerV1Params()
	params.Namespace = agsconfig.Namespace()
	params.Body = &lobbyclientmodels.ModelsUnblockPlayerRequest{UserID: &userID}
	return service.PublicUnblockPlayerV1Short(params)
}

func ListBlockedUsers(accessToken string) ([]string, error) {
	service := newPlayerService(accessToken)
	params := player.NewPublicGetPlayerBlockedPlayersV1Params()
	params.Namespace = agsconfig.Namespace()

	resp, err := service.PublicGetPlayerBlockedPlayersV1Short(params)
	if err != nil {
		return nil, err
	}
	blockedIDs := make([]string, 0, len(resp.Data.Data))
	for _, entry := range resp.Data.Data {
		if entry.BlockedUserID != nil {
			blockedIDs = append(blockedIDs, *entry.BlockedUserID)
		}
	}
	return blockedIDs, nil
}
