type Props = {
  timer: number
}

export const Timer = ({ timer }: Props) => (
  <div className="text-2xl md:text-3xl font-medium text-accent tabular-nums" aria-live="polite" aria-label="Time remaining">
    {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
  </div>
)
