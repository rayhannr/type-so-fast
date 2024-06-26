import React from 'react'

type Props = {
  words: string[]
  isInputCorrect: boolean
}

const WordContainer: React.FC<Props> = (props) => {
  return (
    <div className="max-h-32 overflow-hidden rounded-lg bg-white border-blue-300 border-dashed border-2 p-3 lg:p-4 leading-10 md:leading-11">
      <span
        className={`font-medium text-2xl md:text-3xl lg:text-4xl ${
          props.isInputCorrect ? 'bg-blue-200' : 'bg-red-400'
        } rounded-md text-gray-900 px-1`}
      >
        {props.words[0]}
      </span>
      {props.words.slice(1).map((word, index) => (
        <span className="font-medium text-2xl md:text-3xl lg:text-4xl text-gray-900 px-1" key={index}>
          {word}{' '}
        </span>
      ))}
    </div>
  )
}

export default WordContainer
