import React from 'react'
import classNames from 'classnames'

import ComponentHeader from '../dsComponents/ComponentHeader'
import Dataset, { ComponentName, qriRefFromDataset } from '../../qri/dataset'
// import Dataset, { ComponentName, qriRefFromDataset } from '../../qri/dataset'
// import Transform from '../dsComponents/datasetComponents/Transform'
// import Body from '../dsComponents/datasetComponents/Body'
// import Commit from '../dsComponents/datasetComponents/Commit'
// import Structure from '../dsComponents/datasetComponents/Structure'
import ReadmeEditor from './components/ReadmeEditor'
import MetaEditor from './components/MetaEditor'

export interface ComponentEditorProps {
  dataset: Dataset
  componentName: ComponentName
  onDatasetChange: (field: string[], value: any) => void
  noHeader?: boolean
}

const ComponentEditor: React.FC<ComponentEditorProps> = ({
  dataset,
  componentName,
  onDatasetChange,
  noHeader = false
}) => (
  <div
    className={classNames(
      'rounded-md bg-white w-full overflow-auto', {
      'rounded-tl-none' : noHeader,
      'my-6': !noHeader
    })}
  >
    {!noHeader && <ComponentHeader componentName={componentName} />}
    {(() => {
      switch (componentName) {
        case 'meta':
          return (<MetaEditor
            qriRef={qriRefFromDataset(dataset)}
            onDatasetChange={onDatasetChange}
            data={dataset.meta}
            />)
        case 'readme':
          return (<ReadmeEditor
            qriRef={qriRefFromDataset(dataset)}
            onDatasetChange={onDatasetChange}
            data={dataset.readme}
            />)
        default:
          return <div>Unknown Component</div>
      }
    })()}
  </div>
)

export default ComponentEditor
