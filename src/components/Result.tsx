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
        <p className="bg-blue-600 text-gray-100 text-center font-semibold text-lg py-3 rounded-t-lg">Result</p>
        <div>
            <div className="py-5 border-b border-solid border-gray-200">
                <p className="text-center text-4xl font-bold text-blue-600">{props.wpm} WPM</p>
                <p className="text-xs text-gray-500 text-center">(words per minute)</p>
                <p className="text-xs text-gray-500 text-center">5 correct keystrokes = 1 WPM</p>
            </div>
            <div className="bg-gray-100 result-list">
                <span>Keystrokes</span>
                <span>(<span className="text-blue-600">{props.correctKeystroke}</span> | <span className="text-red-400">{props.wrongKeystroke}</span>) <span>{props.correctKeystroke + props.wrongKeystroke}</span></span>
            </div>
            <div className="result-list">
                <span>Accuracy</span>
                <span className="font-bold">{props.accuracy}%</span>
            </div>
            <div className="bg-gray-100 result-list">
                <span>Correct words</span>
                <span className="font-bold text-blue-600">{props.correctWords}</span>
            </div>
            <div className="result-list">
                <span>Wrong words</span>
                <span className="font-bold text-red-400">{props.wrongWords}</span>
            </div>
        </div>
    </div>
)

export default Result