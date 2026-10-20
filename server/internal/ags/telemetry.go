package ags

import (
	"time"

	"github.com/go-openapi/strfmt"

	gametelemetry "github.com/AccelByte/accelbyte-go-modular-sdk/gametelemetry-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/gametelemetry-sdk/pkg/gametelemetryclient/gametelemetry_operations"
	"github.com/AccelByte/accelbyte-go-modular-sdk/gametelemetry-sdk/pkg/gametelemetryclientmodels"

	"type-so-fast-server/internal/agsconfig"
)

const eventRaceFinished = "race_finished"

type RaceFinished struct {
	GameType         string  `json:"gameType"`
	Mode             string  `json:"mode"`
	Duration         int     `json:"duration"`
	Wpm              float64 `json:"wpm"`
	Accuracy         float64 `json:"accuracy"`
	CorrectKeystroke int     `json:"correctKeystroke"`
	WrongKeystroke   int     `json:"wrongKeystroke"`
	Correction       int     `json:"correction"`
	WordsTyped       int     `json:"wordsTyped"`
	Difficulty       string  `json:"difficulty,omitempty"`
	Outcome          string  `json:"outcome,omitempty"`
}

func SendRaceFinished(accessToken string, event RaceFinished) error {
	configRepo := agsconfig.Player()
	service := &gametelemetry.GametelemetryOperationsService{
		Client:           gametelemetry.NewGametelemetryClient(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(accessToken),
	}

	eventName := eventRaceFinished
	namespace := agsconfig.Namespace()
	now := strfmt.DateTime(time.Now().UTC())
	params := gametelemetry_operations.NewProtectedSaveEventsGameTelemetryV1ProtectedEventsPostParams()
	params.Body = []*gametelemetryclientmodels.TelemetryBody{{
		EventName:       &eventName,
		EventNamespace:  &namespace,
		ClientTimestamp: &now,
		DeviceType:      "web",
		Payload:         event,
	}}

	return service.ProtectedSaveEventsGameTelemetryV1ProtectedEventsPostShort(params)
}
