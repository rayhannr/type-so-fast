import React from 'react'

interface Props {
    wpm: number
    correctKeystroke: number
    wrongKeystroke: number
    accuracy: string
    correctWords: number
    wrongWords: number
}

const Result: React.FC<Props> = props => (
    <div className="mx-auto mt-8 w-64 sm:w-72 md:w-80 lg:w-96 rounded-lg bg-white border border-solid border-gray-200">
        <p className="bg-blue-500 text-gray-100 text-center font-semibold text-lg py-2 rounded-t-lg">Result</p>
        <div>
            <div className="py-4 border-b border-dashed border-gray-200">
                <p className="text-center text-4xl font-bold text-blue-400">{props.wpm} WPM</p>
                <p className="text-xs text-gray-500 text-center">(words per minute)</p>
                <p className="text-xs text-gray-500 text-center">5 correct keystrokes = 1 WPM</p>
            </div>
            <div>
                <span>Keystrokes</span>
                <span>({props.correctKeystroke} | {props.wrongKeystroke}) <span>{props.correctKeystroke + props.wrongKeystroke}</span></span>
            </div>
            <div>
                <span>Accuracy</span>
                <span>{props.accuracy}%</span>
            </div>
            <div>
                <span>Correct words</span>
                <span>{props.correctWords}</span>
            </div>
            <div>
                <span>Wrong words</span>
                <span>{props.wrongWords}</span>
            </div>
        </div>
    </div>
)

export default Result