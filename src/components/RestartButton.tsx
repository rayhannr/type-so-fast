import React from 'react'

type Props = {
  onClick: () => void
}

const RestartButton: React.FC<Props> = (props) => (
  <div className="p-3 text-gray-100 bg-blue-600 ml-2 md:ml-3 rounded-lg cursor-pointer" onClick={props.onClick}>
    <svg className="w-6 h-6 text-gray-100" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
        clipRule="evenodd"
      />
    </svg>
  </div>
)

export default RestartButton
