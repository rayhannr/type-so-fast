package ags

import (
	match2 "github.com/AccelByte/accelbyte-go-modular-sdk/match2-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/match2-sdk/pkg/match2client/match_tickets"
	"github.com/AccelByte/accelbyte-go-modular-sdk/match2-sdk/pkg/match2clientmodels"

	"type-so-fast-server/internal/agsconfig"
)

const matchPool = "pvp-quick-match"

type MatchTicket struct {
	MatchTicketID string `json:"matchTicketID"`
	QueueTime     int32  `json:"queueTime"`
}

type MatchTicketStatus struct {
	MatchFound bool   `json:"matchFound"`
	SessionID  string `json:"sessionID"`
	IsActive   *bool  `json:"isActive,omitempty"`
}

func newMatchTicketsService(accessToken string) *match2.MatchTicketsService {
	configRepo := agsconfig.Player()
	return &match2.MatchTicketsService{
		Client:           match2.NewMatch2Client(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(accessToken),
	}
}

func CreateMatchTicket(accessToken string) (*MatchTicket, error) {
	service := newMatchTicketsService(accessToken)
	pool := matchPool
	params := match_tickets.NewCreateMatchTicketParams()
	params.Namespace = agsconfig.Namespace()
	params.Body = &match2clientmodels.APIMatchTicketRequest{
		MatchPool:  &pool,
		Attributes: map[string]interface{}{},
		Latencies:  map[string]int64{},
	}

	resp, err := service.CreateMatchTicketShort(params)
	if err != nil {
		return nil, err
	}
	return &MatchTicket{MatchTicketID: *resp.Data.MatchTicketID, QueueTime: *resp.Data.QueueTime}, nil
}

func GetMatchTicketStatus(accessToken, ticketID string) (*MatchTicketStatus, error) {
	service := newMatchTicketsService(accessToken)
	params := match_tickets.NewMatchTicketDetailsParams()
	params.Namespace = agsconfig.Namespace()
	params.Ticketid = ticketID

	resp, err := service.MatchTicketDetailsShort(params)
	if err != nil {
		return nil, err
	}
	status := &MatchTicketStatus{
		MatchFound: *resp.Data.MatchFound,
		SessionID:  *resp.Data.SessionID,
	}
	status.IsActive = &resp.Data.IsActive
	return status, nil
}

func CancelMatchTicket(accessToken, ticketID string) error {
	service := newMatchTicketsService(accessToken)
	params := match_tickets.NewDeleteMatchTicketParams()
	params.Namespace = agsconfig.Namespace()
	params.Ticketid = ticketID

	return service.DeleteMatchTicketShort(params)
}
