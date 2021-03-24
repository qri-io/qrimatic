import React from 'react'
import { useDispatch } from 'react-redux';
import numeral from 'numeral'
import ReactDataTable from 'react-data-table-component'
import { Link } from 'react-router-dom'

import { showModal } from '../app/state/appActions'
import { ModalType } from '../app/state/appState'
import Icon from '../../chrome/Icon'
import DurationFormat from '../../chrome/DurationFormat'
import RelativeTimestamp from '../../chrome/RelativeTimestamp'
import DropdownMenu, { DropDownMenuItem } from '../../chrome/DropdownMenu'
import { pathToDatasetPreview } from '../dataset/state/datasetPaths'
import RunStatusBadge from '../run/RunStatusBadge'
import { WorkflowInfo } from '../../qrimatic/workflow';

import ManualTriggerButton from '../manualTrigger/ManualTriggerButton';

interface WorkflowsTableProps {
  filteredWorkflows: WorkflowInfo[]
  // When the clearSelectedTrigger changes value, it triggers the ReactDataTable
  // to its internal the selections
  clearSelectedTrigger: boolean
  onRowClicked: (row: WorkflowInfo) => void
  onSelectedRowsChange: ({ selectedRows }: { selectedRows: WorkflowInfo[] }) => void
  // simplified: true will hide a number of "verbose" columns in the table
  simplified?: boolean
}

// fieldValue returns a WorkflowInfo value for a given field argument
const fieldValue = (row: WorkflowInfo, field: string) => {
  switch (field) {
    case 'name':
      return `${row['username']}/${row['name']}`
    case 'updated':
      return row.commitTime
    case 'size':
      return row.bodySize
    case 'rows':
      return row.bodyRows
    default:
      return (row as Record<string,any>)[field]
  }
}
// column sort function for react-data-table
// defines the actual string to sort on when a sortable column is clicked
const customSort = (rows: WorkflowInfo[], field: string, direction: 'asc' | 'desc') => {
  return rows.sort((a, b) => {
    const aVal = fieldValue(a, field)
    const bVal = fieldValue(b, field)
    if (aVal === bVal) {
      return 0
    } else if (aVal < bVal) {
      return (direction === 'asc') ? -1 : 1
    }
    return (direction === 'asc') ? 1 : -1
  })
}

const statusIcons = [
  {
    id: 'deployed',
    icon: 'playCircle',
    color: 'text-qriblue'
  },
  {
    id: 'paused',
    icon: 'pauseCircle',
    color: 'text-gray-300'
  },
  {
    id: 'notDeployed',
    icon: 'circle',
    color: 'text-gray-300'
  },
]

// react-data-table custom styles
const customStyles = {
  headRow: {
    style: {
      minHeight: '38px'
    }
  },
  rows: {
    style: {
      minHeight: '38px'
    }
  }
}

const WorkflowsTable: React.FC<WorkflowsTableProps> = ({
  filteredWorkflows,
  onRowClicked,
  onSelectedRowsChange,
  clearSelectedTrigger,
  simplified=false
}) => {
  const dispatch = useDispatch()

  const handleButtonClick = (message: string) => {
    alert(message)
  }

  // react-data-table column definitions
  const columns = [
    {
      selector: 'status',
      sortable: true,
      width: '48px',
      style: {
        paddingRight: 0
      },
      cell: (row: WorkflowInfo) => {

        // TODO(b5): WorkflowInfo is missing data required to report paused state
        const { icon, color } = row.id ? statusIcons[0] : statusIcons[2]

        return (
          <div className={`mx-auto ${color}`} style={{ fontSize: '1.5rem' }} >
            <Icon icon={icon} />
          </div>
        )
      }
    },
    {
      name: 'name',
      selector: 'name',
      sortable: true,
      grow: 2,
      cell: (row: WorkflowInfo) => (
        <div className='py-3'>
          <div className='font-medium text-sm mb-1'>
            <Link to={pathToDatasetPreview(row)}>{row.username}/{row.name}</Link>
          </div>
          <div className='text-gray-500 text-xs'>
            <span className='mr-3'><Icon icon='hdd' size='sm' className='mr-1' />{numeral(row.bodySize).format('0.0 b')}</span>
            <span className='mr-3'><Icon icon='bars' size='sm' className='mr-1' />{numeral(row.bodyRows).format('0,0a')} rows</span>
            <span className='mr-3'><Icon icon='file' size='sm' className='mr-1' />{row.bodyFormat}</span>
            {row.commitTime && (
              <span className='mr-3'><Icon icon='clock' size='sm' className='mr-1' /><RelativeTimestamp timestamp={new Date(row.commitTime)}/></span>
            )}

          </div>
        </div>
      )
    },
    {
      name: 'last run',
      selector: 'lastrun',
      omit: simplified,
      grow: 1,
      sortable: true,
      cell: (row: WorkflowInfo) => {

        // TODO (ramfox): the activity feed expects more content than currently exists
        // in the WorkflowInfo. Once the backend supplies these values, we can rip
        // out this section that mocks durations & timestamps for us
        const {
          status,
          latestStart,
          latestEnd,
          commitTime
        } = row 

        var duration: number | undefined
        if (latestStart && latestEnd) {
          duration = (new Date(latestEnd).getTime() - new Date(latestStart).getTime())/1000
        }

        return (
          <div className='flex flex-col'>
            <div className='flex items-center mb-2'>
              <div className='font-bold mr-2'>23</div>
              <RunStatusBadge status={status} size='sm' />
            </div>
            <div className='text-gray-500 text-xs'>
              <Icon icon='clock' size='sm'/> <span><DurationFormat seconds={duration} /> | <RelativeTimestamp timestamp={new Date(commitTime || '')}/></span>
            </div>
          </div>
        )
      }
    },
    {
      name: 'actions',
      selector: 'actions',
      omit: simplified,
      grow: 1,
      cell: (row: WorkflowInfo) => (row.id
          ? <ManualTriggerButton workflowID={row.id} />
          : '--'
      )
    },
    {
      name: '',
      selector: 'hamburger',
      omit: simplified,
      width: '120px',
      // eslint-disable-next-line react/display-name
      cell: (row: WorkflowInfo) => {
        const hamburgerItems: DropDownMenuItem[] = [
          {
            onClick: () => { handleButtonClick("renaming not yet implemented") },
            text: 'Rename...',
            disabled: true
          },
          {
            onClick: () => { handleButtonClick("duplicating not yet implemented")},
            text: 'Duplicate...',
            disabled: true
          },
          {
            onClick: () => { handleButtonClick("export not yet implemented")},
            text: 'Export...',
            disabled: true
          },
          {
            onClick: () => { handleButtonClick("run now not yet implemented")},
            text: 'Run Now',
            disabled: true
          },
          {
            onClick: () => { handleButtonClick("pause not yet implemented")},
            text: 'Pause Workflow',
            disabled: true
          },
          {
            onClick: () => {
              dispatch(
                showModal(
                  ModalType.removeDataset,
                  {
                    username: row.username,
                    name: row.name
                  }
                )
              )
            },
            text: 'Remove...'
          }
        ]
        return (
          <div className='mx-auto text-gray-500'>
            <DropdownMenu items={hamburgerItems}>
              <Icon icon='ellipsisH' size='md'/>
            </DropdownMenu>
          </div>
        )
      }
    }
  ]

  return (
    <ReactDataTable
      overflowY
      columns={columns}
      data={filteredWorkflows}
      customStyles={customStyles}
      sortFunction={customSort}
      highlightOnHover
      pointerOnHover
      noHeader
      onRowClicked={onRowClicked}
      onSelectedRowsChange={onSelectedRowsChange}
      clearSelectedRows={clearSelectedTrigger}
    />
  )
}

export default WorkflowsTable
