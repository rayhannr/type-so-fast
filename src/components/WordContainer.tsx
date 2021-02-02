import React from 'react'

type Props = {
    words: string[]
}

const WordContainer: React.FC<Props> = props => {
    return (
        <div>
            <span>{props.words[0]} </span>
            {props.words.slice(1).map((word, index) => (
                <span key={index}>{word} </span>
            ))}
        </div>
    )
}

export default WordContainer