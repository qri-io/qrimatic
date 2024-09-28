import { createReducer } from '@reduxjs/toolkit'

import { RootState } from '../../../store/store'
import { QriRef, humanRef, refStringFromQriRef } from '../../../qri/ref'
import { LogItem } from '../../../qri/log'
import { Run } from '../../../qri/run'
import { ApiErr, NewApiErr } from '../../../store/api'
import formatRunLogTimestamp from '../../../utils/formatRunLogTimestamp'

export function newDatasetLogsSelector (qriRef: QriRef): (state: RootState) => LogItem[] {
  return (state: RootState) => {
    return state.activityFeed.datasetLogs[refStringFromQriRef(qriRef)] || []
  }
}

export function selectLogCount (qriRef: QriRef): (state: RootState) => number {
  qriRef = humanRef(qriRef)
  return (state: RootState) => {
    return state.activityFeed.datasetLogs[refStringFromQriRef(qriRef)]?.length
  }
}

export function selectIsRunLogLoading (): (state: RootState) => boolean {
  return (state: RootState) => {
    return state.activityFeed.loading
  }
}

export function selectIsRunLogLoadingMore (): (state: RootState) => boolean {
  return (state: RootState) => {
    return state.activityFeed.loadingMore
  }
}

export function selectRunInfo (runID: string): (state: RootState) => RunLogInfoState {
  return (state: RootState) => {
    return state.activityFeed.runInfo[runID]
  }
}

export interface RunLogInfoState {
  error?: string
  runLog?: Run
}

export interface ActivityFeedState {
  datasetLogs: Record<string, LogItem[]>
  loading: boolean
  loadingMore: boolean
  error: ApiErr
  runInfo: Record<string, RunLogInfoState>
}

const initialState: ActivityFeedState = {
  datasetLogs: {},
  loading: false,
  loadingMore: false,
  error: NewApiErr(),
  runInfo: {}
}

// reduces a RunLog to a newline-delimited string, used in run logs
export function outputFromRunLog (runLog: Run): string {
  let logOutput = ''
  logOutput += `[run id     ] ${runLog.id}\n`
  logOutput += `[started    ] ${runLog.startTime}\n`
  logOutput += `[ended      ] ${runLog.stopTime}\n`
  logOutput += `[status     ] ${runLog.status}\n`
  logOutput += `[steps      ] ${runLog.steps.length} total\n`
  logOutput += runLog.steps.reduce((acc, step, i) => {
    let stepString = acc

    stepString += `[step ${i}     ]\n`
    stepString += `[name       ] '${step.name}'\n`
    stepString += `[started    ] ${step.startTime}\n`
    stepString += `[ended      ] ${step.stopTime}\n`
    stepString += `[status     ] ${step.status}\n`

    if (step.output) {
      stepString += step.output.reduce((acc, output) => {
        let outputString = acc
        // TODO(chriswhong): calls to /auto/runinfo are returning Timestamp and Type keys, this needs to be fixed on the backend
        // @ts-expect-error
        outputString += `[${formatRunLogTimestamp(output.Timestamp)}][${output.Type}] ${output.Type === 'tf:DatasetPreview' ? 'created dataset preview' : output.Payload.msg}\n`
        return outputString
      }, '')
    } else {
      stepString += 'no output for this step'
    }

    return stepString
  }, `---\n`)
  return logOutput
}

export const activityFeedReducer = createReducer(initialState, {
  'API_DATASET_ACTIVITY_RUNS_REQUEST': (state, action) => {
    state.loading = true
  },

  'API_DATASET_ACTIVITY_RUNS_SUCCESS': (state, action) => {
    state.loading = false
    state.datasetLogs[refStringFromQriRef(action.qriRef)] = action.payload.data
  },

  'API_DATASET_ACTIVITY_RUNS_FAILURE': (state, action) => {
    state.loading = false
    state.error = action.payload.err
  },

  'API_DATASET_ACTIVITY_RUNS_MORE_REQUEST': (state, action) => {
    state.loadingMore = true
  },

  'API_DATASET_ACTIVITY_RUNS_MORE_SUCCESS': (state, action) => {
    const datasetLogs = [...state.datasetLogs[refStringFromQriRef(action.qriRef)], ...action.payload.data]
    state.datasetLogs[refStringFromQriRef(action.qriRef)] = datasetLogs
    state.loadingMore = false
  },

  'API_DATASET_ACTIVITY_RUNS_MORE_FAILURE': (state, action) => {
    state.error = action.payload.err
    state.loadingMore = false
  },

  'API_DATASET_ACTIVITY_RUN_FIRST_SUCCESS': (state, action) => {
    const datasetLogs = [ ...action.payload.data, ...state.datasetLogs[refStringFromQriRef(action.qriRef)]]
    state.datasetLogs[refStringFromQriRef(action.qriRef)] = datasetLogs
  },

  'API_DATASET_ACTIVITY_RUNS_FIRST_FAILURE': (state, action) => {
    state.error = action.payload.err
  },

  'API_DATASET_ACTIVITY_RUNINFO_SUCCESS': (state, action) => {
    const runID = action.payload.requestID

    state.runInfo[runID] = {
      runLog: action.payload.data
    }
  },

  'API_DATASET_ACTIVITY_RUNINFO_FAILURE': (state, action) => {
    const runID = action.payload.requestID
    state.runInfo[runID] = {
      error: action.payload.err
    }
  }
})
