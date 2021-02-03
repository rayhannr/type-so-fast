import React from 'react'

const Heading: React.FC = () => (
    <>
        <h1 className="text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-blue-600 font-bold text-3xl md:text-4xl lg:text-6xl">TypeSoFast!</h1>
        <h2 className="font-medium text-lg text-center text-gray-500 mt-2">How fast can you type?</h2>
        <h3 className="text-center text-gray-400 mt-1 mb-5">
            A simple <a href="https://10fastfingers.com" target="_blank" rel="noreferrer" className="hover:text-gray-500 cursor-pointer">10fastfingers </a>
         clone for you to test your speed to type in Indonesian
        </h3>
    </>
)

export default Heading