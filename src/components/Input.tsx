import React, { ChangeEvent, KeyboardEvent } from 'react'

interface Props {
    value: string
    onChange: (inputText: string) => void
    onKeyUp: (eventKey: string) => void
}

const Input: React.FC<Props> = props => {
    return (
        <div className="w-64 sm:w-72 md:w-80 lg:w-96 mx-auto mt-8">
            <input
                className="w-full border border-solid border-blue-400 p-3 rounded-md focus:outline-none focus:ring-1"
                type="text"
                value={props.value || ''}
                onChange={(event: ChangeEvent<HTMLInputElement>) => props.onChange(event.target.value)}
                onKeyUp={(event: KeyboardEvent) => props.onKeyUp(event.key)} />
        </div>
    )
}

export default Input