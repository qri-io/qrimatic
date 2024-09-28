import React, { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import ReactDataTable from 'react-data-table-component'

import DurationFormat from '../../chrome/DurationFormat'
import RelativeTimestamp from '../../chrome/RelativeTimestamp'
import Icon from '../../chrome/Icon'
import IconLink from '../../chrome/IconLink'
import DatasetCommitInfo from '../../chrome/DatasetCommitInfo'
import RunStatusBadge from '../run/RunStatusBadge'
import { LogItem } from '../../qri/log'
import { customStyles, customSortIcon } from '../../features/collection/CollectionTable'
import { runEndTime } from '../../utils/runEndTime'
import { newQriRef } from '../../qri/ref'

import { loadDatasetLogsMore, loadRunInfo, DATASET_LOG_PER_PAGE } from './state/activityFeedActions'
import { selectRunInfo, outputFromRunLog, selectIsRunLogLoadingMore } from './state/activityFeedState'
import { selectRunCount } from '../dataset/state/datasetState'
import Spinner from '../../chrome/Spinner'

interface ActivityListProps {
  log: LogItem[]
  showDatasetName?: boolean
  containerHeight: number
}

const ActivityList: React.FC<ActivityListProps> = ({
  log,
  showDatasetName = true,
  containerHeight
}) => {
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [loadMore, setLoadMore] = useState<boolean>(false)
  const dispatch = useDispatch()
  const qriRef = newQriRef(useParams())
  const totalLogCount = useSelector(selectRunCount)
  const loadingMore = useSelector(selectIsRunLogLoadingMore())

  const observer = useRef(
    new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting) {
          setLoadMore(true)
        }
      })
  )

  useEffect(() => {
    const lastRow = document.querySelector(`#row-${log.length - 1}`)
    const currentElement = lastRow
    const currentObserver = observer.current

    if (currentElement) {
      currentObserver.observe(currentElement)
    }

    return () => {
      if (currentElement) {
        currentObserver.unobserve(currentElement)
      }
    }
  }, [log.length])

  useEffect(() => {
    const limitForLoad = (totalLogCount - log.length) >= DATASET_LOG_PER_PAGE ? DATASET_LOG_PER_PAGE : totalLogCount - log.length
    if (loadMore && limitForLoad) {
      dispatch(loadDatasetLogsMore({ username: qriRef.username, name: qriRef.name }, log.length, limitForLoad))
    }
    setLoadMore(false)
  }, [loadMore])

  // react-data-table column definitions
  const columns = [
    {
      name: 'Status',
      selector: (row: LogItem) => row.runStatus,
      width: '200px',
      // eslint-disable-next-line react/display-name
      cell: (row: LogItem) => <RunStatusBadge status={row.runStatus} />
    },
    {
      name: 'name',
      selector: (row: LogItem) => row.name,
      grow: 2,
      omit: !showDatasetName,
      // eslint-disable-next-line react/display-name
      cell: (row: LogItem) => {
        const { username, name } = row
        return (
          <div className='hover:text-qrilightblue hover:underline'>
            <Link to={`/${username}/${name}`}>{username}/{name}</Link>
          </div>
        )
      }
    },
    {
      name: 'Time',
      selector: (row: LogItem) => row.runStart,
      width: '180px',
      // eslint-disable-next-line react/display-name
      cell: (row: LogItem) => {
        const runEnd = runEndTime(row.runStart, row.runDuration)
        return (
          <div className='text-qrigray-400 flex flex-col text-sm'>
            <div className='mb-1'>
              {runEnd ? <RelativeTimestamp timestamp={runEnd} /> : <div className='w-full'>--</div> }
            </div>
            <div className='flex items-center'>
              <Icon icon='clock' size='2xs' className='mr-1' />
              <DurationFormat seconds={Math.ceil(row.runDuration / 1000000000)} />
            </div>
          </div>
        )
      }
    },
    {
      name: 'Commit',
      selector: (row: LogItem) => row.commitMessage,
      width: '180px',
      // eslint-disable-next-line react/display-name
      cell: (row: LogItem) => {
        if (!['failed', 'unchanged', 'running'].includes(row.runStatus)) {
          const versionLink = `/${row.username}/${row.name}/at${row.path}/history/body`
          return (
            <Link to={versionLink} className='min-w-0 flex-grow'>
              <DatasetCommitInfo item={row} small inRow />
            </Link>
          )
        } else {
          return <div className='w-full'>--</div>
        }
      }
    },
    {
      name: '',
      grow: 1,
      // eslint-disable-next-line react/display-name
      cell: (row: LogItem) => {
        const expanded = expandedRows.includes(row.runID)
        return (
          <div className='flex justify-end flex-grow' onClick={() => {
            if (expanded) {
              setExpandedRows(expandedRows.filter(d => d !== row.runID))
            } else {
              dispatch(loadRunInfo(row.runID))
              setExpandedRows([...expandedRows, row.runID])
            }
          }}>
            <IconLink icon={expanded ? 'caretUp' : 'caretDown'} colorClassName='text-qrigray-400 hover:text-qripink-600'/>
          </div>
        )
      }
    }
  ]

  const conditionalRowStyles = [
    {
      when: (row: LogItem) => row.runStatus === 'running',
      classNames: ['animate-appear', 'overflow-hidden', 'min-height-0-important'],
      style: {
        height: 58
      }
    }
  ]

  const ExpandableComponent = (row: {
    data: LogItem
  }) => {
    const runState = useSelector(selectRunInfo(row.data.runID))
    let logs
    if (runState?.runLog) {
      logs = outputFromRunLog(runState.runLog)
    } else if (runState?.error) {
      logs = <div className='text-red-500'>Unable to retrieve logs</div>
    } else {
      logs = <div className='text-loading-ellipsis'>loading</div>
    }

    return (
      <div>
        <pre className='p-8 font-mono bg-qrigray-1000 text-qrigray-100 max-h-96 overflow-y-scroll'>
          {logs}
        </pre>
      </div>
    )
  }

  interface LogItemWithExpanded extends LogItem {
    expanded: boolean
  }

  // borrows styles and icons from CollectionTable
  return (
    <>
      <ReactDataTable
        columns={columns}
        data={log}
        customStyles={customStyles}
        fixedHeader
        expandableRows
        expandableRowExpanded={(row: LogItemWithExpanded) => {
          return expandedRows.includes(row.runID)
        }}
        expandableRowsHideExpander
        expandableRowsComponent={ExpandableComponent}
        conditionalRowStyles={conditionalRowStyles}
        fixedHeaderScrollHeight={`${String(containerHeight)}px`}
        noHeader
        style={{
          background: 'blue'
        }}
        defaultSortField='name'
        sortIcon={customSortIcon}
      />
      {loadingMore && (
        <div className='h-full w-full flex justify-center items-center absolute top-0'>
          <Spinner color='#43B3B2' />
        </div>
      )}
    </>
  )
}

export default ActivityList
