import React from 'react'

import Podium from './Podium'

type Props = {
    records: number[]
}

const Records: React.FC<Props> = props => {
    let userRecords
    if (props.records.length === 0) {
        userRecords = <span className="text-sm text-gray-900 text-center">You have no records yet.</span>
    } else {
        let firstRecord, secondRecord, thirdRecord
        firstRecord = secondRecord = thirdRecord = <></>
        
        const maxRecord: number = props.records[0]
        const midRecord: number = props.records[1]

        props.records.forEach((record, index) => {
            switch (index) {
                case 0:
                    firstRecord = (
                        <Podium record={record} height="h-24" color="bg-blue-400" />
                    )
                    break
                case 1:
                    secondRecord = (
                        <Podium record={record} height={record === maxRecord ? "h-24" : "h-16"} color="bg-blue-300" />
                    )
                    break
                case 2:
                    thirdRecord = (
                        <Podium record={record} height={record === maxRecord ? "h-24" : record === midRecord || maxRecord === midRecord ? "h-16" : "h-8"} color="bg-blue-200" />
                    )
                    break
            }
        })
        userRecords = (
            <div className="flex flex-row items-end justify-center">
                {secondRecord}
                {firstRecord}
                {thirdRecord}
            </div>
        )
    }

    return (
        <div className="hidden lg:block p-4 bg-white border border-blue-300 border-solid rounded-lg">
            <h1 className="font-semibold text-gray-900 mb-2 text-center">Your top records</h1>
            {props.records && userRecords}
        </div>
    )
}

export default Records