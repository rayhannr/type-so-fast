import type { HTMLProps } from 'react'

// visually hidden but not zero-size: some browsers refuse to focus a 0x0 element,
// which would silently prevent autoFocus/programmatic focus from ever working.
// All typing feedback comes from the character display in WordContainer.
export const Input = (props: HTMLProps<HTMLInputElement>) => (
  <input
    className="absolute w-px h-px p-0 m-0 border-0 opacity-0 overflow-hidden pointer-events-none"
    type="text"
    autoCapitalize="off"
    autoCorrect="off"
    autoComplete="off"
    spellCheck={false}
    aria-label="Type the highlighted word"
    {...props}
  />
)
