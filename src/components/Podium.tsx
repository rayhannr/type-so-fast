interface Props {
  record: number
  height: number
  color: string
}

export const Podium = ({ record, height, color }: Props) => (
  <div>
    <p className="text-xs px-2 text-gray-900 font-medium">{record} WPM</p>
    <div className={`w-auto rounded-t-sm ${color}`} style={{ height }}></div>
  </div>
)
