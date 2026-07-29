package agserror

// Detail carries a passthrough AGS error (status + errorCode) so handlers can surface the same
// shape the frontend's agsErrorMessage helper (lib/queries/shared.ts) branches on, instead of
// collapsing every failure into a generic 500.
type Detail struct {
	Status       int
	ErrorCode    int32
	ErrorMessage string
}

func (d *Detail) Error() string { return d.ErrorMessage }
