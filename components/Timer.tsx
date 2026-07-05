type Props = {
  timer: number
}

export const Timer = ({ timer }: Props) => (
  <div className="p-3 md:text-lg bg-gray-100 text-blue-500 font-medium ml-2 md:ml-3 rounded-lg">
    <span>
      {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
    </span>
  </div>
)
