import { QriRef } from '../../../qri/ref'
import { EventLogLine } from '../../../qri/eventLog'
import { NewWorkflow, Workflow, workflowScriptString, WorkflowTrigger } from '../../../qrimatic/workflow'
import { CALL_API, ApiActionThunk, ApiAction } from '../../../store/api'
import {
  WORKFLOW_CHANGE_TRIGGER,
  WORKFLOW_CHANGE_TRANSFORM_STEP,
  RUN_EVENT_LOG,
  TEMP_SET_WORKFLOW_EVENTS,
  SET_WORKFLOW,
  SET_WORKFLOW_REF,
  SET_RUN_MODE,
  RunMode
} from './workflowState'

export function mapWorkflow(d: object | []): Workflow {
  return NewWorkflow((d as Record<string,any>))
}

export function loadWorkflowByDatasetRef(qriRef: QriRef): ApiActionThunk {
  return async (dispatch, getState) => {
    return dispatch(fetchWorkflowByDatasetRef(qriRef))
  }
}

function fetchWorkflowByDatasetRef(qriRef: QriRef): ApiAction {
  return {
    type: 'workflow',
    qriRef,
    [CALL_API]: {
      endpoint: `workflow?dataset_id=${qriRef.username}/${qriRef.name}`,
      method: 'GET',
      map: mapWorkflow
    }
  }
}

export interface SetWorkflowStepAction {
  type: string
  index: number
  script: string
}

export function changeWorkflowTransformStep(index: number, script: string): SetWorkflowStepAction {
  return {
    type: WORKFLOW_CHANGE_TRANSFORM_STEP,
    index,
    script,
  }
}

export interface WorkflowTriggerAction {
  type: string
  index: number,
  trigger: WorkflowTrigger
}

export function changeWorkflowTrigger(index: number, trigger: WorkflowTrigger): WorkflowTriggerAction {
  return {
    type: WORKFLOW_CHANGE_TRIGGER,
    index,
    trigger
  }
}

export interface RunModeAction {
  type: string
  mode: RunMode
}

export function setRunMode(mode: RunMode): RunModeAction {
  return {
    type: SET_RUN_MODE,
    mode,
  }
}

export function applyWorkflowTransform(w: Workflow): ApiActionThunk {
  return async (dispatch, getState) => {
    return dispatch({
      type: 'apply',
      [CALL_API]: {
        endpoint: 'apply',
        method: 'POST',
        body: {
          transform: {
            scriptBytes: btoa(workflowScriptString(w)),
            steps: w.steps
          }
        },
      }
    })
  }
}

export function saveAndApplyWorkflowTransform(w: Workflow): ApiActionThunk {
  return async (dispatch, getState) => {
    throw new Error("we need to ajust the save API endpoint before workflow saving can work")

    // return dispatch({
    //   type: 'save',
    //   [CALL_API]: {
    //     endpoint: 'save',
    //     method: 'POST',
    //     body: {
    //       apply: true,
    //       ref: w.datasetID,
    //       dataset: {
    //         transform: {
    //           scriptBytes: btoa(workflowScriptString(w)),
    //           steps: w.steps
    //         }
    //       }
    //     },
    //   }
    // })
  }
}

export interface EventLogAction {
  type: string
  data: EventLogLine
}

export function runEventLog(event: EventLogLine): EventLogAction {
  return {
    type: RUN_EVENT_LOG,
    data: event,
  }
}

export interface SetWorkflowAction {
  type: string
  workflow: Workflow
}

export function setWorkflow(workflow: Workflow): SetWorkflowAction {
  return {
    type: SET_WORKFLOW,
    workflow
  }
}

// temp action used to work around the api, auto sets the events
// of the workflow without having to have a working api
export interface TempWorkflowAction {
  type: string,
  id: string,
  events: EventLogLine[]
}

// temp action used to work around the api, auto sets the events
// of the workflow without having to have a working api
export function tempSetWorkflowEvents(id: string, events: EventLogLine[]): TempWorkflowAction {
  return {
    type: TEMP_SET_WORKFLOW_EVENTS,
    id,
    events
  }
}

export interface SetWorkflowRefAction {
  type: string
  qriRef: QriRef
}

 export function setWorkflowRef(qriRef: QriRef): SetWorkflowRefAction {
  return {
    type: SET_WORKFLOW_REF,
    qriRef,
  }
}
