import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'

import { ComponentName } from '../../qri/dataset'
import { newQriRef } from '../../qri/ref'
import DatasetCommits from '../commits/DatasetCommits'
import CommitSummaryHeader from '../commits/CommitSummaryHeader'
import TabbedComponentEditor from './TabbedComponentEditor'
import SaveVersionButton from './SaveVersionButton'
import { editDataset, loadEditingDatasetHead } from './state/editDatasetActions'
import { selectDatasetEdits, selectEditingHeadIsLoading } from './state/editDatasetState'

const DatasetEditor: React.FC<{}> = () => {
  const qriRef = newQriRef(useParams())
  const dataset = useSelector(selectDatasetEdits)
  const loading = useSelector(selectEditingHeadIsLoading)
  const dispatch = useDispatch()
  const [component, setComponent] = useState<ComponentName>('body')

  useEffect(() => {
    dispatch(loadEditingDatasetHead(newQriRef({
      username: qriRef.username,
      name: qriRef.name,
    })))
  }, [dispatch, qriRef.username, qriRef.name])

  const dsChangeHandler = (field: string[], value: any) => {
    const ref = newQriRef({
      name: qriRef.name,
      username: qriRef.username,
      selector: field,
    })
    dispatch(editDataset(ref, value))
  }

  return (
    <div className='flex-grow flex overflow-hidden'>
      <DatasetCommits qriRef={qriRef} />
      <div className='flex flex-col w-4/5 overflow-x-hidden'>
        <CommitSummaryHeader dataset={dataset}>
          <SaveVersionButton dataset={dataset} />
        </CommitSummaryHeader>
        <TabbedComponentEditor
          dataset={dataset}
          loading={loading}
          selectedComponent={component} 
          setSelectedComponent={(c: ComponentName) => { setComponent(c) }}
          onDatasetChange={dsChangeHandler}
        />
      </div>
    </div>
  )
}

export default DatasetEditor;
