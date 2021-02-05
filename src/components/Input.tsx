import React, { ChangeEvent, KeyboardEvent } from 'react'

interface Props {
    value: string
    onChange: (inputText: string) => void
    onKeyUp: (eventKey: string) => void
    disabled: boolean
}

const Input: React.FC<Props> = props => {
    return (
        <div className="w-64 sm:w-72 xl:w-96">
            <input
                className={`w-full border border-solid ${props.disabled ? 'bg-gray-100 cursor-not-allowed border-gray-400' : 'bg-white cursor-text border-blue-400'} text-gray-900 font-medium md:text-lg p-3 rounded-md focus:outline-none focus:ring-1`}
                type="text"
                value={props.value || ''}
                onChange={(event: ChangeEvent<HTMLInputElement>) => props.onChange(event.target.value)}
                onKeyUp={(event: KeyboardEvent) => props.onKeyUp(event.key)}
                disabled={props.disabled} />
        </div>
    )
}

export default Input