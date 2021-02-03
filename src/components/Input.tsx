import React, { ChangeEvent } from 'react'

interface Props {
    value: string
    onChange: (inputText: string) => void
}

const Input: React.FC<Props> = props => {
    return (
        <div className=" w-56 mx-auto">
            <input
                className="w-full mt-4 border border-solid border-blue-400 px-2 py-1 rounded-md focus:outline-none focus:ring-1"
                type="text"
                value={props.value || ''}
                onChange={(event: ChangeEvent<HTMLInputElement>) => props.onChange(event.target.value)} />
        </div>
    )
}

export default Input