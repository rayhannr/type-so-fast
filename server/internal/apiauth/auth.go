package apiauth

import "strings"

type Auth struct {
	UserID      string
	AccessToken string
}

// FromHeaders handles the fact that the client stores the raw AGS access token itself
// (no server session), resending it as Authorization: Bearer + X-User-Id on every call.
func FromHeaders(authorization, userID string) *Auth {
	if authorization == "" || userID == "" {
		return nil
	}
	return &Auth{
		UserID:      userID,
		AccessToken: strings.TrimPrefix(authorization, "Bearer "),
	}
}
