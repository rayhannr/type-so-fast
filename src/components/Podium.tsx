import React from 'react'

interface Props{
    record: number
    height: string
    color: string
}

const Podium: React.FC<Props> = props => (
    <div>
        <p className="text-xs px-2 text-gray-900 font-medium">{props.record} WPM</p>
        <div className={`w-auto rounded-t-sm ${props.height} ${props.color}`}></div>
    </div>
)

export default Podium