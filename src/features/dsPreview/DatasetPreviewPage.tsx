import React, { useState, useEffect } from 'react'
import classNames from 'classnames'
import { useSelector, useDispatch } from 'react-redux'
import useDimensions from 'react-use-dimensions'
import { useLocation } from 'react-router-dom'

import { newQriRef, QriRef } from '../../qri/ref'
import { selectDsPreview, selectIsDsPreviewLoading } from './state/dsPreviewState'
import { loadDsPreview } from './state/dsPreviewActions'
import Spinner from '../../chrome/Spinner'
import ContentBox from '../../chrome/ContentBox'
import ContentBoxTitle from '../../chrome/ContentBoxTitle'
import BodyPreview from '../dsComponents/body/BodyPreview'
import DatasetScrollLayout from '../dataset/DatasetScrollLayout'
import Readme from '../dsComponents/readme/Readme'
import MetaChips from '../../chrome/MetaChips'
import DatasetCommitInfo from '../../chrome/DatasetCommitInfo'
import DownloadDatasetButton from "../download/DownloadDatasetButton"
import ContentBoxSubTitle from "../../chrome/ContentBoxSubTitle"
import { newVersionInfoFromDataset } from '../../qri/versionInfo'
import Head from '../app/Head'
import { selectSessionUserCanEditDataset } from '../dataset/state/datasetState'
import { loadDataset } from '../dataset/state/datasetActions'

interface DatasetPreviewPageProps {
  qriRef: QriRef
}

const DatasetPreviewPage: React.FC<DatasetPreviewPageProps> = ({
  qriRef
}) => {
  const dispatch = useDispatch()
  const dataset = useSelector(selectDsPreview)
  const loading = useSelector(selectIsDsPreviewLoading)
  const userCanEditDataset = useSelector(selectSessionUserCanEditDataset)

  const [versionInfoContainer, { height: versionInfoContainerHeight }] = useDimensions()
  const [expandReadme, setExpandReadme] = useState(false)
  const [minReadmeHeight, setMinReadmeHeight] = useState(0)
  const [readmeHeight, setReadmeHeight] = useState(0)

  let readmeContainerHeight = versionInfoContainerHeight || 'auto'

  useEffect(() => {
    if (!isNaN(readmeContainerHeight)) {
      setMinReadmeHeight(readmeContainerHeight - 42)// removing padding here
    }
  }, [ readmeContainerHeight ])

  useEffect(() => {
    const readmeComponent = document.getElementsByClassName('markdown-body')[0]
    const { username, name, path } = dataset
    if (readmeComponent) {
      setReadmeHeight(readmeComponent.clientHeight + 64) // adding padding and see more button dimensions
    }
    if (username && name) {
      dispatch(loadDataset({ username, name, path }))
    }
  }, [ dataset ])

  if (expandReadme) {
    readmeContainerHeight = 'auto'
  }

  useEffect(() => {
    const ref = newQriRef({ username: qriRef.username, name: qriRef.name, path: qriRef.path })
    dispatch(loadDsPreview(ref))
  }, [dispatch, qriRef.username, qriRef.name, qriRef.path ])

  const readmeHeightLargerThanContainerHeight = readmeHeight >= readmeContainerHeight

  const location = useLocation()

  const readmeContent = (
    <div className={classNames('px-3 align-top w-full', {
      'absolute': !expandReadme
    })} style={{ height: readmeContainerHeight }}>
      <ContentBox className='flex flex-col h-full'>
        <div style={{ minHeight: minReadmeHeight }} className='flex flex-col h-full overflow-hidden'>
          <ContentBoxTitle
            title='Readme'
            editLink={userCanEditDataset ? `/${qriRef.username}/${qriRef.name}/edit#readme` : ''}
            editTitle='edit readme'
          />
          <div className={classNames('flex-grow overflow-hidden relative', {
            'fade-bottom': readmeHeightLargerThanContainerHeight
          })}>
            <Readme data={dataset.readme} />
          </div>
          {!expandReadme && (readmeHeightLargerThanContainerHeight) && (<div className='font-semibold text-qritile text-sm cursor-pointer mt-2' onClick={() => { setExpandReadme(true) }}>See More</div>)}
        </div>
      </ContentBox>
    </div>
  )

  return (
    <>
      <Head data={{
        title: `${qriRef.username}/${qriRef.name} dataset preview | Qri`,
        pathname: location.pathname,
        description: dataset?.meta?.description || `Preview page for the Qri Dataset ${qriRef.username}/${qriRef.name}`
      }}/>
      {dataset?.username === ''
        ? (<div className='w-full h-full p-4 flex justify-center items-center'>
          <Spinner color='#43B3B2' />
        </div>)
        : (
          <DatasetScrollLayout contentClassName='max-w-screen-lg mx-auto'>
            <div className='flex -mx-3 mb-6'>
              {dataset.readme && (
              <div className='flex-grow w-7/12 relative hidden md:block'>
                {readmeContent}
              </div>
              )}
              <div ref={versionInfoContainer} className={`${dataset.readme ? 'w-full md:w-5/12' : 'w-full'} px-3 align-top`}>
                <ContentBox>
                  <div className='flex items-center'>
                    <div className='flex-grow truncate'>
                      <div className='flex items-center justify-between'>
                        <div className='flex-grow min-w-0 pr-6'>
                          <ContentBoxTitle title='Latest Version' />
                          <DatasetCommitInfo item={newVersionInfoFromDataset(dataset)} small />
                        </div>
                        <div className='flex flex-shrink-0'>
                          <div className='hidden md:block'>
                            <DownloadDatasetButton title='Download the latest version' hideIcon type='primary' qriRef={qriRef} />
                          </div>
                          <div className='block md:hidden'>
                            <DownloadDatasetButton title='Download the latest version' type='primary' qriRef={qriRef} small />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ContentBox>
                {/* Displays readme content box between version info and meta, shown only on smaller screen widths */}
                {dataset.readme && (
                  <ContentBox className='flex flex-col mt-6 block md:hidden'>
                    <div className='flex flex-col h-full overflow-hidden'>
                      <ContentBoxTitle
                        title='Readme'
                        editLink={userCanEditDataset ? `/${qriRef.username}/${qriRef.name}/edit#readme` : ''}
                        editTitle='edit readme'
                      />
                      <div className={classNames('flex-grow overflow-hidden relative', {
                        'fade-bottom': readmeHeightLargerThanContainerHeight
                      })} style={{ maxHeight: expandReadme ? '' : 256 }}>
                        <Readme data={dataset.readme} />
                      </div>
                      {!expandReadme && (<div className='font-semibold text-qritile text-sm cursor-pointer mt-2' onClick={() => { setExpandReadme(true) }}>See More</div>)}
                    </div>
                  </ContentBox>
                )}
                <ContentBox className='mt-6'>
                  {/* Bottom of the box */}
                  <ContentBoxTitle
                    title='Metadata'
                    editLink={userCanEditDataset ? `/${qriRef.username}/${qriRef.name}/edit#meta` : ''}
                    editTitle='edit metadata'
                  />
                  <ContentBoxSubTitle title='Description' />
                  <div className='text-qrigray-400 text-xs tracking-wider mb-2 break-words'>{(dataset.meta?.description) || 'No Description'}</div>
                  <ContentBoxSubTitle title='Keywords' />
                  {dataset.meta?.keywords
                    ? <MetaChips words={dataset.meta.keywords} />
                    : <div className='text-qrigray-400 text-xs tracking-wider mb-2'>
                      No Keywords
                    </div>}
                </ContentBox>
              </div>
            </div>
            <div className='overflow-hidden' style={{
              height: 'calc(100vh - 215px)'
            }}>
              <ContentBox className='h-full overflow-hidden flex flex-col'>
                <div className='flex flex-col h-full overflow-hidden'>
                  <ContentBoxTitle
                    title='Data'
                    editLink={userCanEditDataset ? `/${qriRef.username}/${qriRef.name}/edit` : ''}
                    editTitle='edit data'
                  />
                  <BodyPreview dataset={dataset} loading={loading} />
                </div>
              </ContentBox>
            </div>
          </DatasetScrollLayout>
          )}
    </>
  )
}

export default DatasetPreviewPage
