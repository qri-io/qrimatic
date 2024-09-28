import { QriRef } from '../../../qri/ref'
import { CALL_API, ApiActionThunk, ApiAction } from '../../../store/api'
import { LogItem, NewLogItem } from '../../../qri/log'

export const DATASET_LOG_PER_PAGE = 15

export function mapLogs (d: object | []): LogItem[] {
  return (d as Array<Record<string, any>>).map(NewLogItem)
}

export function loadDatasetLogs (qriRef: QriRef): ApiActionThunk {
  return async (dispatch, getState) => {
    return dispatch(fetchDatasetLogs(qriRef))
  }
}

export function loadDatasetLogsMore (qriRef: QriRef, offset: number, limit: number): ApiActionThunk {
  return async (dispatch, getState) => {
    return dispatch(fetchDatasetLogsMore(qriRef, offset, limit))
  }
}

export function loadFirstDatasetLog (qriRef: QriRef): ApiActionThunk {
  return async (dispatch, getState) => {
    return dispatch(fetchFirstDatasetLog(qriRef))
  }
}

function fetchDatasetLogs (qriRef: QriRef): ApiAction {
  return {
    type: 'dataset_activity_runs',
    qriRef,
    [CALL_API]: {
      endpoint: `ds/activity`,
      method: 'POST',
      body: {
        ref: `${qriRef.username}/${qriRef.name}`,
        limit: DATASET_LOG_PER_PAGE,
        term: 'run'
      },
      map: mapLogs
    }
  }
}

function fetchDatasetLogsMore (qriRef: QriRef, offset: number, limit: number): ApiAction {
  return {
    type: 'dataset_activity_runs_more',
    qriRef,
    [CALL_API]: {
      endpoint: `ds/activity`,
      method: 'POST',
      body: {
        ref: `${qriRef.username}/${qriRef.name}`,
        limit: limit,
        offset: offset,
        term: 'run'
      },
      map: mapLogs
    }
  }
}

function fetchFirstDatasetLog (qriRef: QriRef): ApiAction {
  return {
    type: 'dataset_activity_run_first',
    qriRef,
    [CALL_API]: {
      endpoint: `ds/activity`,
      method: 'POST',
      body: {
        ref: `${qriRef.username}/${qriRef.name}`,
        limit: 1,
        term: 'run'
      },
      map: mapLogs
    }
  }
}

export function loadRunInfo (runId: string): ApiActionThunk {
  return async (dispatch, getState) => {
    return dispatch(fetchRunInfo(runId))
  }
}

function fetchRunInfo (runId: string): ApiAction {
  return {
    type: 'dataset_activity_runinfo',
    [CALL_API]: {
      endpoint: `auto/runinfo`,
      method: 'POST',
      body: {
        id: runId
      },
      requestID: runId
    }
  }
}
