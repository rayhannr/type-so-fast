import React from 'react'

type Props = {
    timer: number
}

const Timer: React.FC<Props> = props => (
    <div className="p-3 md:text-lg bg-gray-100 text-blue-500 font-medium ml-2 md:ml-3 rounded-lg">
        <span>{Math.floor(props.timer / 60)}:{(props.timer % 60).toString().padStart(2, '0')}</span>
    </div>
)

export default Timer